import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/status-badge'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { listCargoBatches } from '@/lib/queries/cargo'
import { formatDate, humanize } from '@/lib/utils'

export const metadata: Metadata = { title: 'Cargo · Personal Shopper' }

export default async function CargoBatchesPage() {
  const user = await requireUser()
  const batches = await listCargoBatches()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cargo"
        description="Shipments from Bangkok to Malaysia, grouped for shared freight cost."
        actions={
          hasRole(user, 'STAFF') && <ButtonLink href="/cargo-batches/new">New shipment</ButtonLink>
        }
      />

      <Card>
        {batches.length === 0 ? (
          <EmptyState
            title="No cargo batches yet"
            description="Create one once you have purchased orders ready to ship."
            action={
              hasRole(user, 'STAFF') && (
                <ButtonLink href="/cargo-batches/new">New shipment</ButtonLink>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {batches.map((batch) => (
              <li key={batch.id}>
                <Link
                  href={`/cargo-batches/${batch.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {batch.label} <Badge className="ml-1">{humanize(batch.status)}</Badge>
                    </p>
                    <p className="text-xs text-muted">
                      {batch.shipDate ? formatDate(batch.shipDate) : 'No ship date yet'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm text-muted">
                    {batch.orderCount} order{batch.orderCount === 1 ? '' : 's'} ·{' '}
                    {formatMYR(batch.totalCost)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
