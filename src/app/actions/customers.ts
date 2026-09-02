'use server'

import { Prisma, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { db } from '@/lib/db'
import { authorize } from '@/lib/dal'
import { customerSchema, invalid, type ActionState } from '@/lib/validation'

function readForm(formData: FormData) {
  return {
    name: formData.get('name'),
    whatsappNumber: formData.get('whatsappNumber'),
    tiktok: formData.get('tiktok'),
    instagram: formData.get('instagram'),
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2'),
    city: formData.get('city'),
    state: formData.get('state'),
    postcode: formData.get('postcode'),
    notes: formData.get('notes'),
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  }
}

const DUPLICATE_NUMBER = {
  ok: false as const,
  message: 'A customer with that WhatsApp number already exists.',
  fieldErrors: { whatsappNumber: ['Already in use.'] },
}

export async function createCustomer(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = customerSchema.safeParse(readForm(formData))
  if (!parsed.success) return invalid(parsed.error)

  let id: string
  try {
    const created = await db.customer.create({ data: parsed.data })
    id = created.id
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return DUPLICATE_NUMBER
    }
    throw error
  }

  revalidatePath('/customers')
  redirect(`/customers/${id}`)
}

export async function updateCustomer(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = customerSchema.safeParse(readForm(formData))
  if (!parsed.success) return invalid(parsed.error)

  try {
    await db.customer.update({ where: { id }, data: parsed.data })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return DUPLICATE_NUMBER
    }
    throw error
  }

  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return { ok: true, message: 'Customer saved.' }
}
