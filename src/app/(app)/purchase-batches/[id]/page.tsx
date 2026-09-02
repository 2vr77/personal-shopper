import Link from 'next/link'
import { notFound } from 'next/navigation'

import { addOrdersToPurchaseBatch, closePurchaseBatch } from '@/app/actions/purchasing'
import { Badge } from '@/components/status-badge'
import { Button, Card, EmptyState, PageHeader } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { getPurchaseBatch, ordersAwaitingPurchase } from '@/lib/queries/purchasing'
import { formatDate } from '@/lib/utils'

import { PurchaseItemRow } from './purchase-item-row'

export async function generateMetadata(props: PageProps<'/purchase-batches/[id]'>) {
  const { id } = await props.params
  const batch = await getPurchaseBatch(id)
  return { title: `${batch?.label ?? 'Purchase trip'} · Personal Shopper` }
}

export default async function PurchaseBatchDetailPage(
  props: PageProps<'/purchase-batches/[id]'>
) {
  const user = await requireUser()
  const { id } = await props.params
  const batch = await getPurchaseBatch(id)
  if (!batch) notFound()

  const canEdit = hasRole(user, 'STAFF')
  const isClosed = !!batch.closedAt
  const awaitingOrders = canEdit && !isClosed ? await ordersAwaitingPurchase() : []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={batch.label}
        description={`${formatDate(batch.tripDate)} · ${batch.items.length} item${
          batch.items.length === 1 ? '' : 's'
        }`}
        actions={
          <>
            {isClosed && <Badge className="border-slate-200 bg-slate-100">Closed</Badge>}
            {canEdit && !isClosed && (
              <form action={closePurchaseBatch}>
                <input type="hidden" name="batchId" value={batch.id} />
                <Button type="submit" variant="secondary">
                  Close trip
                </Button>
              </form>
            )}
          </>
        }
      />

      {canEdit && !isClosed && (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Add paid orders to this trip</h2>
          </div>
          {awaitingOrders.length === 0 ? (
            <EmptyState
              title="No orders waiting"
              description="Orders appear here once their payment is verified."
            />
          ) : (
            <form action={addOrdersToPurchaseBatch} className="p-4">
              <input type="hidden" name="batchId" value={batch.id} />
              <ul className="divide-y divide-line">
                {awaitingOrders.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      name="orderIds"
                      value={order.id}
                      className="size-4 rounded border-line"
                    />
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-muted">{order.customer.name}</span>
                    <span className="ml-auto text-muted">{order.itemCount} items</span>
                  </li>
                ))}
              </ul>
              <Button type="submit" className="mt-3">
                Add to trip
              </Button>
            </form>
          )}
        </Card>
      )}

      <Card>
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-medium">Shopping list</h2>
        </div>
        {batch.shoppingList.length === 0 ? (
          <EmptyState title="Nothing left to buy" description="Every item has been actioned." />
        ) : (
          <ul className="divide-y divide-line">
            {batch.shoppingList.map((line) => (
              <li
                key={`${line.productName}-${line.variant}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium">{line.productName}</span>
                  <span className="text-muted"> · {line.variant}</span>
                  {line.supplier && <span className="text-muted"> · {line.supplier}</span>}
                </div>
                <span className="font-medium tabular-nums">×{line.qty}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-medium">Items</h2>
        </div>
        {batch.items.length === 0 ? (
          <EmptyState title="No items yet" description="Add orders above to populate this trip." />
        ) : (
          <ul className="divide-y divide-line">
            {batch.items.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <Link
                      href={`/orders/${item.orderItem.order.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.orderItem.order.orderNumber}
                    </Link>
                    <span className="text-muted">
                      {' '}
                      · {item.orderItem.product.name}
                      {item.orderItem.variant &&
                        ` (${[item.orderItem.variant.color, item.orderItem.variant.size]
                          .filter(Boolean)
                          .join(' · ')})`}{' '}
                      × {item.orderItem.qty}
                    </span>
                  </div>
                  {item.purchasedBy && (
                    <span className="text-xs text-muted">by {item.purchasedBy.name}</span>
                  )}
                </div>
                <PurchaseItemRow
                  purchaseItemId={item.id}
                  defaults={{
                    status: item.status,
                    actualCost: item.actualCost,
                    store: item.store,
                    note: item.note,
                  }}
                  disabled={isClosed}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
