import 'server-only'

import { db } from '@/lib/db'

export async function listConversations() {
  return db.whatsAppConversation.findMany({
    orderBy: { lastMessageAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true } },
      messages: { orderBy: { sentAt: 'desc' }, take: 1 },
    },
  })
}

export async function getConversation(id: string) {
  return db.whatsAppConversation.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      messages: { orderBy: { sentAt: 'asc' } },
    },
  })
}

export async function listTemplates() {
  return db.messageTemplate.findMany({ orderBy: { key: 'asc' } })
}

export async function getTemplate(id: string) {
  return db.messageTemplate.findUnique({ where: { id } })
}
