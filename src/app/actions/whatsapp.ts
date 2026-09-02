'use server'

import { Prisma, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { authorize } from '@/lib/dal'
import { db } from '@/lib/db'
import {
  invalid,
  messageTemplateSchema,
  sendMessageSchema,
  type ActionState,
} from '@/lib/validation'
import { extractVariables } from '@/lib/whatsapp/render-template'
import { sendText } from '@/lib/whatsapp/service'

export async function sendInboxMessage(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = sendMessageSchema.safeParse({
    conversationId: formData.get('conversationId'),
    body: formData.get('body'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const conversation = await db.whatsAppConversation.findUnique({
    where: { id: parsed.data.conversationId },
    select: { phoneNumber: true },
  })
  if (!conversation) return { ok: false, message: 'That conversation no longer exists.' }

  await sendText(conversation.phoneNumber, parsed.data.body)

  revalidatePath(`/inbox/${parsed.data.conversationId}`)
  revalidatePath('/inbox')
  return { ok: true, message: 'Sent.' }
}

export async function linkConversationToCustomer(formData: FormData): Promise<void> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return

  const conversationId = String(formData.get('conversationId') ?? '')
  const customerId = String(formData.get('customerId') ?? '')
  if (!conversationId || !customerId) return

  await db.whatsAppConversation.update({ where: { id: conversationId }, data: { customerId } })
  revalidatePath(`/inbox/${conversationId}`)
  revalidatePath('/inbox')
}

const DUPLICATE_KEY = {
  ok: false as const,
  message: 'That key is already in use.',
  fieldErrors: { key: ['Already in use.'] },
}

export async function createTemplate(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = messageTemplateSchema.safeParse({
    key: formData.get('key'),
    name: formData.get('name'),
    body: formData.get('body'),
    active: formData.get('active') === 'on',
  })
  if (!parsed.success) return invalid(parsed.error)

  let id: string
  try {
    const created = await db.messageTemplate.create({
      data: { ...parsed.data, variables: extractVariables(parsed.data.body) },
    })
    id = created.id
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return DUPLICATE_KEY
    }
    throw error
  }

  revalidatePath('/message-templates')
  redirect(`/message-templates/${id}`)
}

export async function updateTemplate(
  id: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const auth = await authorize(Role.STAFF)
  if (!auth.ok) return { ok: false, message: auth.error }

  const parsed = messageTemplateSchema.safeParse({
    key: formData.get('key'),
    name: formData.get('name'),
    body: formData.get('body'),
    active: formData.get('active') === 'on',
  })
  if (!parsed.success) return invalid(parsed.error)

  try {
    await db.messageTemplate.update({
      where: { id },
      data: { ...parsed.data, variables: extractVariables(parsed.data.body) },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return DUPLICATE_KEY
    }
    throw error
  }

  revalidatePath('/message-templates')
  revalidatePath(`/message-templates/${id}`)
  return { ok: true, message: 'Template saved.' }
}

/**
 * ADMIN-only, unlike every other STAFF-gated action here — this toggles
 * whether real messages go out to customers at all, a bigger blast radius
 * than editing a single order.
 */
export async function updateAutomationSettings(formData: FormData): Promise<void> {
  const auth = await authorize(Role.ADMIN)
  if (!auth.ok) return

  const whatsappEnabled = formData.get('whatsappEnabled') === 'on'
  const notifyOnStatusChange = formData.get('notifyOnStatusChange') === 'on'

  await db.setting.upsert({
    where: { key: 'automation' },
    update: { value: { whatsappEnabled, notifyOnStatusChange } },
    create: { key: 'automation', value: { whatsappEnabled, notifyOnStatusChange } },
  })

  revalidatePath('/settings')
}
