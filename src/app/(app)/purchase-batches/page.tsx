import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/status-badge'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { listPurchaseBatches } from '@/lib/queries/purchasing'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Purchase trips · Personal Shopper' }

export default async function PurchaseBatchesPage() {
  const user = await requireUser()
  const batches = await listPurchaseBatches()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Purchase trips"
        description="Each trip groups paid orders into a shopping list for Bangkok."
        actions={
          hasRole(user, 'STAFF') && <ButtonLink href="/purchase-batches/new">New trip</ButtonLink>
        }
      />

      <Card>
        {batches.length === 0 ? (
          <EmptyState
            title="No purchase trips yet"
            description="Create a trip once you have paid orders ready to buy."
            action={
              hasRole(user, 'STAFF') && (
                <ButtonLink href="/purchase-batches/new">New trip</ButtonLink>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {batches.map((batch) => (
              <li key={batch.id}>
                <Link
                  href={`/purchase-batches/${batch.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {batch.label}
                      {batch.closedAt && (
                        <Badge className="ml-2 border-slate-200 bg-slate-100">Closed</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted">{formatDate(batch.tripDate)}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm text-muted">
                    {batch.orderCount} order{batch.orderCount === 1 ? '' : 's'} ·{' '}
                    {batch.itemCount} item{batch.itemCount === 1 ? '' : 's'}
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
