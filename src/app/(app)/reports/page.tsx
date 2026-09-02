import type { Metadata } from 'next'

import { Button, Card, EmptyState, Field, Input, PageHeader } from '@/components/ui'
import { requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { ORDER_STATUS_LABEL } from '@/lib/order-status'
import {
  getCategoryPerformance,
  getOrderStatusBreakdown,
  getProfitReport,
  getTimeSeriesData,
} from '@/lib/queries/reports'

export const metadata: Metadata = { title: 'Reports · Personal Shopper' }

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default async function ReportsPage(props: PageProps<'/reports'>) {
  await requireUser()
  const searchParams = await props.searchParams

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)

  const fromParam = typeof searchParams.from === 'string' ? searchParams.from : ''
  const toParam = typeof searchParams.to === 'string' ? searchParams.to : ''

  const from = fromParam ? new Date(fromParam) : defaultFrom
  const to = toParam ? new Date(toParam) : now
  const toEnd = new Date(to)
  toEnd.setHours(23, 59, 59, 999)

  const [report, statusBreakdown, timeSeries, categoryPerformance] = await Promise.all([
    getProfitReport(from, toEnd),
    getOrderStatusBreakdown(from, toEnd),
    getTimeSeriesData(from, toEnd),
    getCategoryPerformance(from, toEnd),
  ])

  const stats = [
    { label: 'Revenue', value: formatMYR(report.revenue) },
    { label: 'Goods cost', value: formatMYR(report.goodsCost) },
    { label: 'Cargo & shipping', value: formatMYR(report.cargoShipping) },
    {
      label: 'Net profit',
      value: formatMYR(report.netProfit),
      tone: report.netProfit < 0 ? 'text-red-600' : 'text-emerald-700',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description={`${report.orderCount} order${report.orderCount === 1 ? '' : 's'} in range`}
      />

      <Card className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <Field label="From" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={toDateInputValue(from)} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={toDateInputValue(to)} />
          </Field>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${stat.tone ?? ''}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Top products</h2>
          </div>
          {report.topProducts.length === 0 ? (
            <EmptyState title="No sales in range" />
          ) : (
            <ul className="divide-y divide-line">
              {report.topProducts.map((p) => (
                <li key={p.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted"> · ×{p.qty}</span>
                  </div>
                  <span className="tabular-nums">{formatMYR(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Top customers</h2>
          </div>
          {report.topCustomers.length === 0 ? (
            <EmptyState title="No orders in range" />
          ) : (
            <ul className="divide-y divide-line">
              {report.topCustomers.map((c) => (
                <li key={c.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted">
                      {' '}
                      · {c.orders} order{c.orders === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="tabular-nums">{formatMYR(c.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Order status breakdown</h2>
          </div>
          {statusBreakdown.length === 0 ? (
            <EmptyState title="No orders in range" />
          ) : (
            <ul className="divide-y divide-line">
              {statusBreakdown.map((s) => (
                <li key={s.status} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">{ORDER_STATUS_LABEL[s.status]}</span>
                  <span className="tabular-nums text-muted">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Category performance</h2>
          </div>
          {categoryPerformance.length === 0 ? (
            <EmptyState title="No sales in range" />
          ) : (
            <ul className="divide-y divide-line">
              {categoryPerformance.map((c) => (
                <li
                  key={c.category}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{c.category}</span>
                    <span className="text-muted"> · ×{c.qty}</span>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums">{formatMYR(c.revenue)}</div>
                    <div className="text-xs text-muted">margin: {formatMYR(c.margin)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {timeSeries.length > 0 && (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Revenue over time</h2>
          </div>
          <div className="px-4 py-6">
            <div className="flex h-48 items-end gap-1">
              {timeSeries.map((point, i) => {
                const maxRevenue = Math.max(...timeSeries.map((p) => p.revenue))
                const height = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0
                return (
                  <div key={i} className="group relative flex-1">
                    <div
                      className="rounded-t bg-emerald-600 transition-opacity group-hover:opacity-80"
                      style={{ height: `${height}%` }}
                    />
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                      <div>{new Date(point.date).toLocaleDateString()}</div>
                      <div>{formatMYR(point.revenue)}</div>
                      <div>
                        {point.orderCount} order{point.orderCount === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
