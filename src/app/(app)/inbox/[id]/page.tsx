import { notFound } from 'next/navigation'

import { linkConversationToCustomer } from '@/app/actions/whatsapp'
import { Card, EmptyState, PageHeader, Select } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { customerOptions } from '@/lib/queries/catalog'
import { getConversation } from '@/lib/queries/whatsapp'
import { cn, formatDateTime } from '@/lib/utils'

import { ComposeForm } from './compose-form'

export async function generateMetadata(props: PageProps<'/inbox/[id]'>) {
  const { id } = await props.params
  const conversation = await getConversation(id)
  return {
    title: `${conversation?.customer?.name ?? conversation?.phoneNumber ?? 'Conversation'} · Personal Shopper`,
  }
}

export default async function ConversationPage(props: PageProps<'/inbox/[id]'>) {
  const user = await requireUser()
  const { id } = await props.params
  const conversation = await getConversation(id)
  if (!conversation) notFound()

  const canEdit = hasRole(user, 'STAFF')
  const customers = canEdit && !conversation.customerId ? await customerOptions() : []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={conversation.customer?.name ?? conversation.phoneNumber}
        description={conversation.phoneNumber}
      />

      {!conversation.customerId && (
        <Card className="p-4">
          {canEdit ? (
            <form action={linkConversationToCustomer} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="conversationId" value={conversation.id} />
              <span className="text-sm text-muted">Not linked to a customer:</span>
              <Select name="customerId" required className="max-w-xs">
                <option value="">Choose…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.whatsappNumber}
                  </option>
                ))}
              </Select>
              <button type="submit" className="text-sm text-accent hover:underline">
                Link
              </button>
            </form>
          ) : (
            <p className="text-sm text-muted">Not linked to a customer record.</p>
          )}
        </Card>
      )}

      <Card>
        {conversation.messages.length === 0 ? (
          <EmptyState title="No messages yet" />
        ) : (
          <ul className="flex flex-col gap-3 p-4">
            {conversation.messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'max-w-md rounded-lg px-3 py-2 text-sm',
                  m.direction === 'OUTBOUND' ? 'ml-auto bg-accent/10' : 'bg-slate-100'
                )}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(m.sentAt)}</p>
              </li>
            ))}
          </ul>
        )}
        {canEdit && <ComposeForm conversationId={conversation.id} />}
      </Card>
    </div>
  )
}
