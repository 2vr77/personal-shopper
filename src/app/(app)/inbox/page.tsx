import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, EmptyState, PageHeader } from '@/components/ui'
import { requireUser } from '@/lib/dal'
import { listConversations } from '@/lib/queries/whatsapp'
import { formatRelative } from '@/lib/utils'
import { isWhatsAppConnected } from '@/lib/whatsapp'

export const metadata: Metadata = { title: 'Inbox · Personal Shopper' }

export default async function InboxPage() {
  await requireUser()
  const conversations = await listConversations()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inbox" description="WhatsApp conversations with customers." />

      {!isWhatsAppConnected && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No WhatsApp provider is connected — messages sent here are logged only, not
          delivered. See WHATSAPP_PROVIDER in the README once you onboard a BSP.
        </p>
      )}

      <Card>
        {conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Conversations appear here once a customer messages in, or once you send the first message from an order."
          />
        ) : (
          <ul className="divide-y divide-line">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/inbox/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.customer?.name ?? c.phoneNumber}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {c.messages[0]?.body ?? 'No messages yet'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatRelative(c.lastMessageAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
