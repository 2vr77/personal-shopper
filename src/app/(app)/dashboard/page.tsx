import type { Metadata } from 'next'
import Link from 'next/link'

import { StatusBadge } from '@/components/status-badge'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABEL } from '@/lib/order-status'
import { getDashboard } from '@/lib/queries/dashboard'
import { formatRelative } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard · Personal Shopper' }

export default async function DashboardPage(props: PageProps<'/dashboard'>) {
  const user = await requireUser()
  const searchParams = await props.searchParams
  const denied = searchParams.denied === '1'

  const data = await getDashboard()

  const stats = [
    { label: 'Active orders', value: String(data.activeCount), href: '/orders' },
    {
      label: 'Awaiting payment',
      value: String(data.awaitingPayment),
      href: '/orders?status=AWAITING_PAYMENT',
    },
    { label: 'Delivered this month', value: String(data.deliveredThisMonth) },
    { label: 'Revenue this month', value: formatMYR(data.revenueThisMonth) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        description={`${data.customerCount} customers · ${data.productCount} products in the catalogue`}
        actions={<ButtonLink href="/orders/new">New order</ButtonLink>}
      />

      {denied && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          You do not have permission to open that page.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const body = (
            <Card className="h-full p-4">
              <p className="text-sm text-muted">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
            </Card>
          )
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="rounded-xl">
              {body}
            </Link>
          ) : (
            <div key={stat.label}>{body}</div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-medium">Recent orders</h2>
            <Link href="/orders" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Create your first order to see it here."
              action={<ButtonLink href="/orders/new">New order</ButtonLink>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.orderNumber} · {order.customer.name}
                      </p>
                      <p className="text-xs text-muted">
                        {formatRelative(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={order.status} />
                      <span className="w-24 text-right text-sm font-medium tabular-nums">
                        {formatMYR(order.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Pipeline</h2>
          </div>
          <ul className="divide-y divide-line">
            {data.byStatus
              .filter((s) => ORDER_STATUS_FLOW.includes(s.status))
              .map(({ status, count }) => (
                <li key={status}>
                  <Link
                    href={`/orders?status=${status}`}
                    className="flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="text-slate-600">
                      {ORDER_STATUS_LABEL[status]}
                    </span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
