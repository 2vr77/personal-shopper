import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/status-badge'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { listTemplates } from '@/lib/queries/whatsapp'

export const metadata: Metadata = { title: 'Message templates · Personal Shopper' }

export default async function TemplatesPage() {
  const user = await requireUser()
  const templates = await listTemplates()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Message templates"
        description="Sent automatically on order status changes when automation is on, keyed as status_<status>."
        actions={
          hasRole(user, 'STAFF') && (
            <ButtonLink href="/message-templates/new">New template</ButtonLink>
          )
        }
      />

      <Card>
        {templates.length === 0 ? (
          <EmptyState
            title="No templates yet"
            description="Add one keyed status_payment_verified, status_shipped, etc. to notify customers automatically."
            action={
              hasRole(user, 'STAFF') && (
                <ButtonLink href="/message-templates/new">New template</ButtonLink>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {templates.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/message-templates/${t.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {t.name}
                      {!t.active && (
                        <Badge className="ml-2 border-slate-200 bg-slate-100">Inactive</Badge>
                      )}
                    </p>
                    <p className="font-mono text-xs text-muted">{t.key}</p>
                  </div>
                  <p className="max-w-xs truncate text-xs text-muted">{t.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
