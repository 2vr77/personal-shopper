'use server'

import { CargoStatus, OrderStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { authorize } from '@/lib/dal'
import { db } from '@/lib/db'
import { computeAllocation } from '@/lib/cargo-allocation'
import { round2, toNumber } from '@/lib/money'
import {
  cargoBatchSchema,
  cargoCostSchema,
  invalid,
  type ActionState,
} from '@/lib/validation'
import { notifyOrderStatusChange } from '@/lib/whatsapp/automation'

export async function createCargoBatch(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = cargoBatchSchema.safeParse({
    label: formData.get('label'),
    shipDate: formData.get('shipDate'),
    expectedArrival: formData.get('expectedArrival'),
    allocationMethod: formData.get('allocationMethod'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const batch = await db.cargoBatch.create({ data: parsed.data })
  revalidatePath('/cargo-batches')
  redirect(`/cargo-batches/${batch.id}`)
}

/** Same bulk-move reasoning as `addOrdersToPurchaseBatch` — see that comment. */
export async function addOrdersToCargo(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const cargoBatchId = String(formData.get('cargoBatchId') ?? '')
  const orderIds = formData.getAll('orderIds').map(String)
  if (!cargoBatchId || orderIds.length === 0) return

  const orders = await db.order.findMany({
    where: { id: { in: orderIds }, status: OrderStatus.PURCHASED, cargoBatchId: null },
    select: { id: true, status: true },
  })

  for (const order of orders) {
    const weightRaw = formData.get(`weight_${order.id}`)
    const weight = weightRaw ? Number(weightRaw) : null

    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: { cargoBatchId, status: OrderStatus.IN_CARGO },
      }),
      db.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.IN_CARGO,
          changedById: auth.user.id,
          note: 'Added to cargo batch',
        },
      }),
      db.cargoOrder.create({
        data: { cargoBatchId, orderId: order.id, weight: weight && weight > 0 ? weight : null },
      }),
    ])
    await notifyOrderStatusChange(order.id, OrderStatus.IN_CARGO)
  }

  revalidatePath(`/cargo-batches/${cargoBatchId}`)
  revalidatePath('/orders')
}

/**
 * Recomputes each order's share of the batch's cargo cost and writes it back
 * to both `CargoOrder.allocatedCost` (the audit trail) and `Order.cargoFee` /
 * `Order.total`, so profit numbers reflect the real freight cost rather than
 * the estimate entered when the order was created.
 */
export async function updateCargoAllocation(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = cargoCostSchema.safeParse({
    cargoBatchId: formData.get('cargoBatchId'),
    totalCost: formData.get('totalCost'),
    allocationMethod: formData.get('allocationMethod'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const { cargoBatchId, totalCost, allocationMethod } = parsed.data

  const cargoOrders = await db.cargoOrder.findMany({
    where: { cargoBatchId },
    include: {
      order: {
        select: {
          id: true,
          subtotal: true,
          discount: true,
          shippingFee: true,
          _count: { select: { items: true } },
        },
      },
    },
  })
  if (cargoOrders.length === 0) {
    return { ok: false, message: 'Add orders to this batch before allocating cost.' }
  }

  let manual: Record<string, number> | undefined
  if (allocationMethod === 'MANUAL') {
    manual = {}
    for (const co of cargoOrders) {
      manual[co.orderId] = round2(Number(formData.get(`manual_${co.orderId}`) ?? 0))
    }
  }

  const allocation = computeAllocation(
    cargoOrders.map((co) => ({
      orderId: co.orderId,
      weight: co.weight ? Number(co.weight) : null,
      itemCount: co.order._count.items,
    })),
    totalCost,
    allocationMethod,
    manual
  )

  await db.$transaction(async (tx) => {
    await tx.cargoBatch.update({ where: { id: cargoBatchId }, data: { totalCost, allocationMethod } })

    for (const co of cargoOrders) {
      const allocatedCost = allocation[co.orderId] ?? 0
      const total = round2(
        toNumber(co.order.subtotal) -
          toNumber(co.order.discount) +
          allocatedCost +
          toNumber(co.order.shippingFee)
      )
      await tx.cargoOrder.update({ where: { id: co.id }, data: { allocatedCost } })
      await tx.order.update({ where: { id: co.orderId }, data: { cargoFee: allocatedCost, total } })
    }
  })

  revalidatePath(`/cargo-batches/${cargoBatchId}`)
  revalidatePath('/orders')
  return { ok: true, message: 'Cost allocated across all orders in this batch.' }
}

/** The "Arrived-Malaysia bulk order update": one click moves every order. */
export async function markCargoArrived(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const cargoBatchId = String(formData.get('cargoBatchId') ?? '')
  if (!cargoBatchId) return

  const orders = await db.order.findMany({
    where: { cargoBatchId, status: OrderStatus.IN_CARGO },
    select: { id: true },
  })

  await db.$transaction([
    db.cargoBatch.update({
      where: { id: cargoBatchId },
      data: { status: CargoStatus.ARRIVED, actualArrival: new Date() },
    }),
    ...orders.flatMap((order) => [
      db.order.update({ where: { id: order.id }, data: { status: OrderStatus.ARRIVED_MY } }),
      db.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.IN_CARGO,
          toStatus: OrderStatus.ARRIVED_MY,
          changedById: auth.user.id,
          note: 'Cargo batch arrived in Malaysia',
        },
      }),
    ]),
  ])

  for (const order of orders) {
    await notifyOrderStatusChange(order.id, OrderStatus.ARRIVED_MY)
  }

  revalidatePath(`/cargo-batches/${cargoBatchId}`)
  revalidatePath('/orders')
}
