'use server'

import { OrderStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { extractOrderFromText } from '@/lib/ai-extraction'
import { db } from '@/lib/db'
import { authorize } from '@/lib/dal'
import { round2 } from '@/lib/money'
import { allowedTransitions } from '@/lib/order-status'
import { invalid, orderSchema, type ActionState } from '@/lib/validation'
import { notifyOrderStatusChange } from '@/lib/whatsapp/automation'

export async function createOrder(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  // The line items are edited client-side, so they arrive as one JSON field
  // rather than a set of indexed inputs.
  let rawItems: unknown
  try {
    rawItems = JSON.parse(String(formData.get('items') ?? '[]'))
  } catch {
    return { ok: false, message: 'Could not read the order items. Please try again.' }
  }

  const parsed = orderSchema.safeParse({
    customerId: formData.get('customerId'),
    discount: formData.get('discount') || 0,
    cargoFee: formData.get('cargoFee') || 0,
    shippingFee: formData.get('shippingFee') || 0,
    notes: formData.get('notes'),
    items: rawItems,
  })
  if (!parsed.success) return invalid(parsed.error)

  const { items, customerId, discount, cargoFee, shippingFee, notes } = parsed.data

  // Re-read the products server-side: prices sent by the browser decide what the
  // customer is charged, but the cost basis must come from our own records, and
  // this also rejects ids that do not exist.
  const products = await db.product.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.productId))] } },
    select: { id: true, purchasePrice: true },
  })
  const costById = new Map(products.map((p) => [p.id, p.purchasePrice]))

  const unknown = items.find((i) => !costById.has(i.productId))
  if (unknown) {
    return { ok: false, message: 'One of the selected products no longer exists.' }
  }

  const subtotal = round2(
    items.reduce((sum, i) => sum + i.sellingPrice * i.qty, 0)
  )
  const total = round2(subtotal - discount + cargoFee + shippingFee)

  if (total < 0) {
    return {
      ok: false,
      message: 'The discount is larger than the order total.',
      fieldErrors: { discount: ['Cannot exceed the order value.'] },
    }
  }

  const order = await db.order.create({
    data: {
      customerId,
      createdById: auth.user.id,
      status: OrderStatus.NEW,
      subtotal,
      discount,
      cargoFee,
      shippingFee,
      total,
      notes,
      items: {
        create: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          qty: i.qty,
          sellingPrice: i.sellingPrice,
          purchaseCost: costById.get(i.productId)!,
          notes: i.notes,
        })),
      },
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: OrderStatus.NEW,
          changedById: auth.user.id,
          note: 'Order created',
        },
      },
    },
    select: { id: true },
  })

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  redirect(`/orders/${order.id}`)
}

export async function changeOrderStatus(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const orderId = String(formData.get('orderId') ?? '')
  const next = String(formData.get('status') ?? '') as OrderStatus
  const note = String(formData.get('note') ?? '').trim() || null

  if (!orderId || !Object.values(OrderStatus).includes(next)) {
    return { ok: false, message: 'Choose a status to move to.' }
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  })
  if (!order) return { ok: false, message: 'That order no longer exists.' }

  // Re-check the transition here, not just in the UI — the dropdown is only a
  // hint and this action accepts any posted value.
  if (!allowedTransitions(order.status).includes(next)) {
    return { ok: false, message: 'That is not a valid next status for this order.' }
  }

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: {
        status: next,
        deliveredAt: next === OrderStatus.DELIVERED ? new Date() : null,
      },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: next,
        changedById: auth.user.id,
        note,
      },
    }),
  ])

  await notifyOrderStatusChange(orderId, next)

  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/dashboard')
  return { ok: true, message: 'Status updated.' }
}

/**
 * Extract structured order information from free-form text using AI.
 * Requires ANTHROPIC_API_KEY to be configured.
 */
export async function extractOrder(text: string) {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false as const, error: auth.error }

  if (!text.trim()) {
    return { ok: false as const, error: 'Please provide text to extract' }
  }

  const extracted = await extractOrderFromText(text)
  if (!extracted) {
    return { ok: false as const, error: 'Could not extract order information. AI extraction may not be configured.' }
  }

  return { ok: true as const, data: extracted }
}
