import { z } from 'zod'
import { AllocationMethod, PaymentMethod, PurchaseItemStatus } from '@prisma/client'

/**
 * Shape every Server Action returns to `useActionState`. `fieldErrors` drives the
 * inline messages under each input; `message` is for whole-form failures.
 */
export type ActionState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Zod's own `.flatten()` moved around between major versions, so we build the
 * field-error map from `issues` directly — stable across zod releases.
 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    ;(result[key] ??= []).push(issue.message)
  }
  return result
}

export function invalid(error: z.ZodError, message = 'Please fix the errors below.'): ActionState {
  return { ok: false, message, fieldErrors: fieldErrorsOf(error) }
}

/** Treats an empty or whitespace-only form field as "not provided". */
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()

/** Malaysian numbers are entered inconsistently; normalise to +60XXXXXXXXX. */
export function normalizeWhatsApp(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('60')) return `+${digits}`
  if (digits.startsWith('0')) return `+60${digits.slice(1)}`
  return `+${digits}`
}

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
})

export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  whatsappNumber: z
    .string()
    .trim()
    .min(8, 'Enter a WhatsApp number.')
    .transform(normalizeWhatsApp)
    .refine((v) => /^\+\d{8,15}$/.test(v), 'Enter a valid phone number, e.g. 012-345 6789.'),
  tiktok: optionalText,
  instagram: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  state: optionalText,
  postcode: optionalText,
  notes: optionalText,
  active: z.coerce.boolean().default(true),
})

const money = z.coerce
  .number({ message: 'Enter a number.' })
  .min(0, 'Cannot be negative.')
  .max(9_999_999, 'That is too large.')

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  sku: z
    .string()
    .trim()
    .min(2, 'SKU is required.')
    .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dot, dash or underscore only.')
    .transform((v) => v.toUpperCase()),
  category: optionalText,
  supplier: optionalText,
  purchasePrice: money,
  sellingPrice: money,
  active: z.coerce.boolean().default(true),
})

export const variantSchema = z.object({
  productId: z.string().min(1),
  color: optionalText,
  size: optionalText,
  skuSuffix: optionalText,
  stockNote: optionalText,
})

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Choose a product.'),
  variantId: z
    .string()
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  qty: z.coerce.number().int('Whole numbers only.').min(1, 'At least 1.').max(999, 'Too many.'),
  sellingPrice: money,
  notes: optionalText,
})

export const orderSchema = z.object({
  customerId: z.string().min(1, 'Choose a customer.'),
  discount: money.default(0),
  cargoFee: money.default(0),
  shippingFee: money.default(0),
  notes: optionalText,
  items: z.array(orderItemSchema).min(1, 'Add at least one item.'),
})

const paymentMethods = Object.values(PaymentMethod) as [PaymentMethod, ...PaymentMethod[]]
const purchaseItemStatuses = Object.values(PurchaseItemStatus) as [
  PurchaseItemStatus,
  ...PurchaseItemStatus[],
]
const allocationMethods = Object.values(AllocationMethod) as [
  AllocationMethod,
  ...AllocationMethod[],
]

/** Turns an HTML `<input type="date">` value into a Date, or null when blank. */
const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : new Date(v)))
  .nullable()
  .refine((d) => d === null || !Number.isNaN(d.getTime()), 'Enter a valid date.')

export const paymentSchema = z.object({
  orderId: z.string().min(1),
  amount: money.refine((v) => v > 0, 'Must be greater than 0.'),
  method: z.enum(paymentMethods).default('BANK_TRANSFER'),
  reference: optionalText,
  note: optionalText,
})

export const purchaseBatchSchema = z.object({
  label: z.string().trim().min(2, 'Give the trip a label.'),
  tripDate: z
    .string()
    .min(1, 'Choose a date.')
    .transform((v) => new Date(v))
    .refine((d) => !Number.isNaN(d.getTime()), 'Enter a valid date.'),
  notes: optionalText,
})

export const purchaseItemUpdateSchema = z.object({
  purchaseItemId: z.string().min(1),
  status: z.enum(purchaseItemStatuses),
  actualCost: money.optional(),
  store: optionalText,
  note: optionalText,
})

export const cargoBatchSchema = z.object({
  label: z.string().trim().min(2, 'Give the batch a label.'),
  shipDate: optionalDate,
  expectedArrival: optionalDate,
  allocationMethod: z.enum(allocationMethods).default('WEIGHT'),
  notes: optionalText,
})

export const cargoCostSchema = z.object({
  cargoBatchId: z.string().min(1),
  totalCost: money,
  allocationMethod: z.enum(allocationMethods),
})

export const messageTemplateSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Key is required.')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers and underscores only.'),
  name: z.string().trim().min(2, 'Name is required.'),
  body: z.string().trim().min(2, 'Message body is required.'),
  active: z.coerce.boolean().default(true),
})

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1, 'Type a message.').max(4096, 'Message is too long.'),
})
