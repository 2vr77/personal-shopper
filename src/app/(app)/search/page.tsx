import type { Metadata } from 'next'
import Link from 'next/link'

import { StatusBadge } from '@/components/status-badge'
import { Card, EmptyState, PageHeader } from '@/components/ui'
import { requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { globalSearch } from '@/lib/queries/search'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Search · Personal Shopper' }

export default async function SearchPage(props: PageProps<'/search'>) {
  await requireUser()
  const searchParams = await props.searchParams
  const query = typeof searchParams.q === 'string' ? searchParams.q : ''

  const results = await globalSearch(query)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Search"
        description={
          query
            ? `${results.total} result${results.total === 1 ? '' : 's'} for “${query}”`
            : 'Type in the box above to search.'
        }
      />

      {query && results.total === 0 && (
        <Card>
          <EmptyState
            title="Nothing found"
            description="Try an order number, customer name, phone number or SKU."
          />
        </Card>
      )}

      {results.orders.length > 0 && (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Orders</h2>
          </div>
          <ul className="divide-y divide-line">
            {results.orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {order.orderNumber} · {order.customer.name}
                    </p>
                    <p className="text-xs text-muted">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="text-sm tabular-nums">
                      {formatMYR(order.total)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {results.customers.length > 0 && (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Customers</h2>
          </div>
          <ul className="divide-y divide-line">
            {results.customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="text-sm font-medium">{customer.name}</span>
                  <span className="text-sm tabular-nums text-muted">
                    {customer.whatsappNumber}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {results.products.length > 0 && (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Products</h2>
          </div>
          <ul className="divide-y divide-line">
            {results.products.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/products/${product.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="font-mono text-xs text-muted">{product.sku}</p>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatMYR(product.sellingPrice)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
