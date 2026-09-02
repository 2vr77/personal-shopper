import 'server-only'

import { MessageDirection, MessageStatus, MessageType } from '@prisma/client'

import { db } from '@/lib/db'
import { normalizeWhatsApp } from '@/lib/validation'

import { whatsappProvider } from './index'
import { renderTemplate } from './render-template'

async function getOrCreateConversation(phoneNumber: string) {
  const normalized = normalizeWhatsApp(phoneNumber)
  const existing = await db.whatsAppConversation.findUnique({
    where: { phoneNumber: normalized },
  })
  if (existing) return existing

  // A first-time inbound message or an outbound send to a number we haven't
  // talked to before both land here — link it to a customer record if one
  // already exists with this number, otherwise leave it unlinked for a staff
  // member to match up from the Inbox.
  const customer = await db.customer.findUnique({ where: { whatsappNumber: normalized } })
  return db.whatsAppConversation.create({
    data: { phoneNumber: normalized, customerId: customer?.id ?? null },
  })
}

export async function sendText(phoneNumber: string, body: string) {
  const conversation = await getOrCreateConversation(phoneNumber)
  const result = await whatsappProvider.sendText(conversation.phoneNumber, body)

  await db.$transaction([
    db.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEXT,
        body,
        waMessageId: result.waMessageId,
        status: result.status === 'SENT' ? MessageStatus.SENT : MessageStatus.FAILED,
      },
    }),
    db.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ])

  return result
}

/**
 * Meta requires an approved template to initiate a conversation outside the
 * 24-hour customer-service window, which is what every automated,
 * order-status notification is — so this is the only path automation uses.
 * Returns null (no-op, not an error) when the template doesn't exist or is
 * switched off, so a missing template never blocks an order status change.
 */
export async function sendTemplateMessage(
  phoneNumber: string,
  templateKey: string,
  variables: Record<string, string>
) {
  const template = await db.messageTemplate.findUnique({ where: { key: templateKey } })
  if (!template || !template.active) return null

  const body = renderTemplate(template.body, variables)
  const conversation = await getOrCreateConversation(phoneNumber)
  const result = await whatsappProvider.sendTemplate(conversation.phoneNumber, templateKey, variables)

  await db.$transaction([
    db.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.TEMPLATE,
        body,
        waMessageId: result.waMessageId,
        status: result.status === 'SENT' ? MessageStatus.SENT : MessageStatus.FAILED,
      },
    }),
    db.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ])

  return result
}

export async function recordInboundMessage(params: {
  phoneNumber: string
  body: string
  waMessageId?: string
  type?: MessageType
  mediaUrl?: string
}) {
  // Providers retry webhook delivery aggressively; the same message can
  // arrive more than once with the same id.
  if (params.waMessageId) {
    const existing = await db.whatsAppMessage.findUnique({
      where: { waMessageId: params.waMessageId },
    })
    if (existing) return existing
  }

  const conversation = await getOrCreateConversation(params.phoneNumber)

  const [message] = await db.$transaction([
    db.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        type: params.type ?? MessageType.TEXT,
        body: params.body,
        mediaUrl: params.mediaUrl,
        waMessageId: params.waMessageId,
        status: MessageStatus.DELIVERED,
        sentAt: new Date(),
      },
    }),
    db.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    }),
  ])

  return message
}
