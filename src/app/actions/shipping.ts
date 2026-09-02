'use server'

import { OrderStatus, Role, ShipmentStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { authorize } from '@/lib/dal'
import { db } from '@/lib/db'
import { csvColumn, csvToObjects } from '@/lib/csv'
import type { ActionState } from '@/lib/validation'
import { notifyOrderStatusChange } from '@/lib/whatsapp/automation'

const MAX_CSV_BYTES = 2 * 1024 * 1024

/**
 * Reads a J&T-style tracking CSV (Order Reference, Tracking Number, optional
 * Weight/Shipping Cost) and, for each matched row, books or updates the
 * shipment and bulk-advances the order from ARRIVED_MY to SHIPPED — the "bulk
 * tracking match-back" step after the export has been run through J&T.
 */
export async function importTrackingCsv(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Choose a CSV file to import.' }
  }
  if (file.size > MAX_CSV_BYTES) {
    return { ok: false, message: 'File is larger than 2MB.' }
  }

  const rows = csvToObjects(await file.text())
  if (rows.length === 0) {
    return { ok: false, message: 'That file has no data rows.' }
  }

  let matched = 0
  const notFound: string[] = []
  const skipped: string[] = []

  for (const row of rows) {
    const orderNumber = csvColumn(row, ['order reference', 'order number', 'orderreference'])
    const trackingNumber = csvColumn(row, ['tracking number', 'trackingnumber', 'tracking'])
    const weightRaw = csvColumn(row, ['weight (kg)', 'weight'])
    const costRaw = csvColumn(row, ['shipping cost', 'cost'])

    if (!orderNumber || !trackingNumber) {
      skipped.push(orderNumber || '(blank row)')
      continue
    }

    const order = await db.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true },
    })
    if (!order) {
      notFound.push(orderNumber)
      continue
    }

    const weight = weightRaw ? Number(weightRaw) : null
    const cost = costRaw ? Number(costRaw) : 0
    const existing = await db.shipment.findFirst({ where: { orderId: order.id } })

    await db.$transaction([
      existing
        ? db.shipment.update({
            where: { id: existing.id },
            data: { trackingNumber, weight, cost, status: ShipmentStatus.BOOKED, bookedAt: new Date() },
          })
        : db.shipment.create({
            data: {
              orderId: order.id,
              courier: 'J&T',
              trackingNumber,
              weight,
              cost,
              status: ShipmentStatus.BOOKED,
              bookedAt: new Date(),
            },
          }),
      ...(order.status === OrderStatus.ARRIVED_MY
        ? [
            db.order.update({ where: { id: order.id }, data: { status: OrderStatus.SHIPPED } }),
            db.orderStatusHistory.create({
              data: {
                orderId: order.id,
                fromStatus: OrderStatus.ARRIVED_MY,
                toStatus: OrderStatus.SHIPPED,
                changedById: auth.user.id,
                note: `Tracking ${trackingNumber} imported from J&T CSV`,
              },
            }),
          ]
        : []),
    ])
    if (order.status === OrderStatus.ARRIVED_MY) {
      await notifyOrderStatusChange(order.id, OrderStatus.SHIPPED)
    }
    matched++
  }

  revalidatePath('/shipping')
  revalidatePath('/orders')

  const parts = [`${matched} shipment${matched === 1 ? '' : 's'} updated`]
  if (notFound.length) {
    parts.push(
      `${notFound.length} order number(s) not found: ${notFound.slice(0, 5).join(', ')}${notFound.length > 5 ? '…' : ''}`
    )
  }
  if (skipped.length) {
    parts.push(`${skipped.length} row(s) skipped (missing order reference or tracking number)`)
  }

  return { ok: matched > 0, message: parts.join('. ') }
}

/** Advances a shipment's own status; delivery also closes out the order. */
export async function updateShipmentStatus(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const shipmentId = String(formData.get('shipmentId') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!shipmentId || !Object.values(ShipmentStatus).includes(status as ShipmentStatus)) return

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: { orderId: true },
  })
  if (!shipment) return

  await db.shipment.update({
    where: { id: shipmentId },
    data: {
      status: status as ShipmentStatus,
      deliveredAt: status === ShipmentStatus.DELIVERED ? new Date() : undefined,
    },
  })

  if (status === ShipmentStatus.DELIVERED) {
    const order = await db.order.findUnique({
      where: { id: shipment.orderId },
      select: { status: true },
    })
    if (order?.status === OrderStatus.SHIPPED) {
      await db.$transaction([
        db.order.update({
          where: { id: shipment.orderId },
          data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
        }),
        db.orderStatusHistory.create({
          data: {
            orderId: shipment.orderId,
            fromStatus: OrderStatus.SHIPPED,
            toStatus: OrderStatus.DELIVERED,
            changedById: auth.user.id,
            note: 'Marked delivered',
          },
        }),
      ])
      await notifyOrderStatusChange(shipment.orderId, OrderStatus.DELIVERED)
    }
  }

  revalidatePath('/shipping')
  revalidatePath('/orders')
  revalidatePath(`/orders/${shipment.orderId}`)
}
