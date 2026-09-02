import type { Metadata } from 'next'
import Link from 'next/link'
import { OrderStatus } from '@prisma/client'

import { StatusBadge } from '@/components/status-badge'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { ORDER_STATUS_LABEL } from '@/lib/order-status'
import { listOrders } from '@/lib/queries/orders'
import { cn, formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Orders · Personal Shopper' }

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && value in OrderStatus
}

export default async function OrdersPage(props: PageProps<'/orders'>) {
  await requireUser()
  const searchParams = await props.searchParams

  const status = isOrderStatus(searchParams.status) ? searchParams.status : undefined
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined
  const page = Number(searchParams.page ?? 1) || 1

  const { rows, total, pageCount } = await listOrders({ status, query, page })

  const filterHref = (next?: OrderStatus) => {
    const params = new URLSearchParams()
    if (next) params.set('status', next)
    if (query) params.set('q', query)
    const qs = params.toString()
    return qs ? `/orders?${qs}` : '/orders'
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description={`${total} order${total === 1 ? '' : 's'}${
          status ? ` · ${ORDER_STATUS_LABEL[status]}` : ''
        }`}
        actions={<ButtonLink href="/orders/new">New order</ButtonLink>}
      />

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={filterHref()}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium',
            !status
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-line bg-surface text-slate-600 hover:bg-slate-50'
          )}
        >
          All
        </Link>
        {Object.values(OrderStatus).map((s) => (
          <Link
            key={s}
            href={filterHref(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              status === s
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-surface text-slate-600 hover:bg-slate-50'
            )}
          >
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No orders found"
            description={
              status || query
                ? 'Try clearing the filters.'
                : 'Create your first order to get started.'
            }
            action={
              !status && !query && <ButtonLink href="/orders/new">New order</ButtonLink>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Customer</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Items</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                  <th className="px-4 py-2.5 text-right font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/customers/${order.customer.id}`}
                        className="hover:underline"
                      >
                        {order.customer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                      {order.itemCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatMYR(order.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/orders?${new URLSearchParams({
                  ...(status ? { status } : {}),
                  ...(query ? { q: query } : {}),
                  page: String(page - 1),
                })}`}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-slate-50"
              >
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link
                href={`/orders?${new URLSearchParams({
                  ...(status ? { status } : {}),
                  ...(query ? { q: query } : {}),
                  page: String(page + 1),
                })}`}
                className="rounded-lg border border-line px-3 py-1.5 hover:bg-slate-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
