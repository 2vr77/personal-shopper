'use server'

import { PaymentStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { authorize } from '@/lib/dal'
import { db } from '@/lib/db'
import { UploadError, saveUpload } from '@/lib/storage'
import { invalid, paymentSchema, type ActionState } from '@/lib/validation'

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
    select: { orderId: true, status: true },
  })
  if (!payment || payment.status !== PaymentStatus.PENDING) return

  await db.payment.update({
    where: { id: paymentId },
    data: { status: decision, verifiedById: auth.user.id, verifiedAt: new Date() },
  })

  revalidatePath(`/orders/${payment.orderId}`)
}
