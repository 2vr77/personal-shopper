'use server'

import { Prisma, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { db } from '@/lib/db'
import { authorize } from '@/lib/dal'
import {
  invalid,
  productSchema,
  variantSchema,
  type ActionState,
} from '@/lib/validation'

function readForm(formData: FormData) {
  return {
    name: formData.get('name'),
    sku: formData.get('sku'),
    category: formData.get('category'),
    supplier: formData.get('supplier'),
    purchasePrice: formData.get('purchasePrice'),
    sellingPrice: formData.get('sellingPrice'),
    active: formData.get('active') === 'on' || formData.get('active') === 'true',
  }
}

const DUPLICATE_SKU = {
  ok: false as const,
  message: 'That SKU is already in use.',
  fieldErrors: { sku: ['Already in use.'] },
}

export async function createProduct(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = productSchema.safeParse(readForm(formData))
  if (!parsed.success) return invalid(parsed.error)

  let id: string
  try {
    const created = await db.product.create({ data: parsed.data })
    id = created.id
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return DUPLICATE_SKU
    }
    throw error
  }

  revalidatePath('/products')
  redirect(`/products/${id}`)
}

export async function updateProduct(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = productSchema.safeParse(readForm(formData))
  if (!parsed.success) return invalid(parsed.error)

  try {
    await db.product.update({ where: { id }, data: parsed.data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return DUPLICATE_SKU
    }
    throw error
  }

  revalidatePath('/products')
  revalidatePath(`/products/${id}`)
  return { ok: true, message: 'Product saved.' }
}

export async function addVariant(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = variantSchema.safeParse({
    productId: formData.get('productId'),
    color: formData.get('color'),
    size: formData.get('size'),
    skuSuffix: formData.get('skuSuffix'),
    stockNote: formData.get('stockNote'),
  })
  if (!parsed.success) return invalid(parsed.error)

  if (!parsed.data.color && !parsed.data.size) {
    return { ok: false, message: 'Give the variant a colour, a size, or both.' }
  }

  try {
    await db.productVariant.create({ data: parsed.data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { ok: false, message: 'That colour and size combination already exists.' }
    }
    throw error
  }

  revalidatePath(`/products/${parsed.data.productId}`)
  return { ok: true, message: 'Variant added.' }
}

export async function deleteVariant(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const id = String(formData.get('variantId') ?? '')
  const productId = String(formData.get('productId') ?? '')
  if (!id) return

  // Orders reference variants, so retire rather than delete to keep order
  // history readable. `onDelete: SetNull` would silently blank past orders.
  await db.productVariant.update({ where: { id }, data: { active: false } })
  revalidatePath(`/products/${productId}`)
}
