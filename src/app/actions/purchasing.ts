'use server'

import { OrderStatus, PurchaseItemStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { authorize } from '@/lib/dal'
import { db } from '@/lib/db'
import { UploadError, saveUpload } from '@/lib/storage'
import {
  invalid,
  purchaseBatchSchema,
  purchaseItemUpdateSchema,
  type ActionState,
} from '@/lib/validation'
import { notifyOrderStatusChange } from '@/lib/whatsapp/automation'

export async function createPurchaseBatch(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = purchaseBatchSchema.safeParse({
    label: formData.get('label'),
    tripDate: formData.get('tripDate'),
    notes: formData.get('notes'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const batch = await db.purchaseBatch.create({ data: parsed.data })
  revalidatePath('/purchase-batches')
  redirect(`/purchase-batches/${batch.id}`)
}

/**
 * Adding an order to a shopping trip is also the moment it moves from
 * "waiting to be shopped for" to "being shopped for" — bypasses the
 * one-step-at-a-time rule in `allowedTransitions()` because this is a
 * system-driven bulk move, not a user picking from the status dropdown.
 */
export async function addOrdersToPurchaseBatch(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const batchId = String(formData.get('batchId') ?? '')
  const orderIds = formData.getAll('orderIds').map(String)
  if (!batchId || orderIds.length === 0) return

  const orders = await db.order.findMany({
    where: { id: { in: orderIds }, status: OrderStatus.PAYMENT_VERIFIED, purchaseBatchId: null },
    include: { items: { select: { id: true } } },
  })

  for (const order of orders) {
    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: { purchaseBatchId: batchId, status: OrderStatus.PURCHASING },
      }),
      db.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.PURCHASING,
          changedById: auth.user.id,
          note: 'Added to purchase batch',
        },
      }),
      db.purchaseItem.createMany({
        data: order.items.map((item) => ({ batchId, orderItemId: item.id })),
      }),
    ])
    await notifyOrderStatusChange(order.id, OrderStatus.PURCHASING)
  }

  revalidatePath(`/purchase-batches/${batchId}`)
  revalidatePath('/orders')
}

export async function updatePurchaseItem(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  // The lowest role in the system — STAFF and ADMIN pass too — because this
  // is the Bangkok shopper's own screen.
  const auth = await authorize(Role.SHOPPER)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = purchaseItemUpdateSchema.safeParse({
    purchaseItemId: formData.get('purchaseItemId'),
    status: formData.get('status'),
    actualCost: formData.get('actualCost') || undefined,
    store: formData.get('store'),
    note: formData.get('note'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const receipt = formData.get('receipt')
  let receiptUrl: string | undefined
  if (receipt instanceof File && receipt.size > 0) {
    try {
      receiptUrl = (await saveUpload(receipt, 'purchases')).url
    } catch (error) {
      if (error instanceof UploadError) return { ok: false, message: error.message }
      throw error
    }
  }

  const item = await db.purchaseItem.findUnique({
    where: { id: parsed.data.purchaseItemId },
    include: { orderItem: { select: { orderId: true } } },
  })
  if (!item) return { ok: false, message: 'That item no longer exists.' }

  await db.purchaseItem.update({
    where: { id: item.id },
    data: {
      status: parsed.data.status,
      actualCost: parsed.data.actualCost,
      store: parsed.data.store,
      note: parsed.data.note,
      receiptUrl,
      purchasedById: auth.user.id,
      purchasedAt: new Date(),
    },
  })

  // Once every item on an order has been bought, the order itself advances —
  // otherwise closing out a shopping trip would require re-visiting every
  // order individually in the order list.
  const orderId = item.orderItem.orderId
  const siblings = await db.purchaseItem.findMany({
    where: { orderItem: { orderId } },
    select: { status: true },
  })
  const allPurchased =
    siblings.length > 0 && siblings.every((s) => s.status === PurchaseItemStatus.PURCHASED)

  if (allPurchased) {
    const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true } })
    if (order?.status === OrderStatus.PURCHASING) {
      await db.$transaction([
        db.order.update({ where: { id: orderId }, data: { status: OrderStatus.PURCHASED } }),
        db.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: OrderStatus.PURCHASING,
            toStatus: OrderStatus.PURCHASED,
            changedById: auth.user.id,
            note: 'All items purchased',
          },
        }),
      ])
      await notifyOrderStatusChange(orderId, OrderStatus.PURCHASED)
      revalidatePath(`/orders/${orderId}`)
    }
  }

  revalidatePath(`/purchase-batches/${item.batchId}`)
  return { ok: true, message: 'Item updated.' }
}

export async function closePurchaseBatch(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const batchId = String(formData.get('batchId') ?? '')
  if (!batchId) return

  await db.purchaseBatch.update({ where: { id: batchId }, data: { closedAt: new Date() } })
  revalidatePath(`/purchase-batches/${batchId}`)
  revalidatePath('/purchase-batches')
}
