'use server'

import { OrderStatus, PaymentStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { authorize } from '@/lib/dal'
import { db } from '@/lib/db'
import { ORDER_STATUS_FLOW } from '@/lib/order-status'
import { UploadError, saveUpload } from '@/lib/storage'
import { invalid, paymentSchema, type ActionState } from '@/lib/validation'
import { notifyOrderStatusChange } from '@/lib/whatsapp/automation'

export async function recordPayment(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = paymentSchema.safeParse({
    orderId: formData.get('orderId'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    reference: formData.get('reference'),
    note: formData.get('note'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const receipt = formData.get('receipt')
  let upload: { url: string; fileName: string } | null = null
  if (receipt instanceof File && receipt.size > 0) {
    try {
      upload = await saveUpload(receipt, 'payments')
    } catch (error) {
      if (error instanceof UploadError) return { ok: false, message: error.message }
      throw error
    }
  }

  await db.payment.create({
    data: {
      ...parsed.data,
      receipts: upload
        ? { create: { fileUrl: upload.url, fileName: upload.fileName } }
        : undefined,
    },
  })

  revalidatePath(`/orders/${parsed.data.orderId}`)
  return { ok: true, message: 'Payment recorded.' }
}

/**
 * Void + single-FormData, like `deleteVariant`/`closePurchaseBatch` — this is a
 * two-button decision on a hidden payment id, not a user-editable form, so
 * there is no state worth threading through `useActionState`.
 */
export async function decidePayment(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const paymentId = String(formData.get('paymentId') ?? '')
  const decision = String(formData.get('decision') ?? '')
  if (!paymentId || (decision !== PaymentStatus.VERIFIED && decision !== PaymentStatus.REJECTED)) {
    return
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { orderId: true, status: true, order: { select: { status: true } } },
  })
  if (!payment || payment.status !== PaymentStatus.PENDING) return

  const paymentUpdate = db.payment.update({
    where: { id: paymentId },
    data: { status: decision, verifiedById: auth.user.id, verifiedAt: new Date() },
  })

  // A verified payment also confirms the order itself, unless it has already
  // moved further along the pipeline (e.g. a second payment verified after
  // purchasing has already started) — same "system-driven move" reasoning as
  // the bulk batch-assignment actions.
  const orderStatus = payment.order.status
  const shouldAdvanceOrder =
    decision === PaymentStatus.VERIFIED &&
    ORDER_STATUS_FLOW.indexOf(orderStatus) < ORDER_STATUS_FLOW.indexOf(OrderStatus.PAYMENT_VERIFIED)

  if (shouldAdvanceOrder) {
    await db.$transaction([
      paymentUpdate,
      db.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAYMENT_VERIFIED },
      }),
      db.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          fromStatus: orderStatus,
          toStatus: OrderStatus.PAYMENT_VERIFIED,
          changedById: auth.user.id,
          note: 'Payment verified',
        },
      }),
    ])
    await notifyOrderStatusChange(payment.orderId, OrderStatus.PAYMENT_VERIFIED)
  } else {
    await db.$transaction([paymentUpdate])
  }

  revalidatePath(`/orders/${payment.orderId}`)
  revalidatePath('/orders')
  revalidatePath('/dashboard')
}
