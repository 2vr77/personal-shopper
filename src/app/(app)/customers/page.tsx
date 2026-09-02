import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/status-badge'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { requireUser } from '@/lib/dal'
import { listCustomers } from '@/lib/queries/catalog'

export const metadata: Metadata = { title: 'Customers · Personal Shopper' }

export default async function CustomersPage(props: PageProps<'/customers'>) {
  await requireUser()
  const searchParams = await props.searchParams
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined

  const customers = await listCustomers(query)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description={
          query
            ? `${customers.length} match${customers.length === 1 ? '' : 'es'} for “${query}”`
            : `${customers.length} customer${customers.length === 1 ? '' : 's'}`
        }
        actions={<ButtonLink href="/customers/new">Add customer</ButtonLink>}
      />

      <Card>
        {customers.length === 0 ? (
          <EmptyState
            title={query ? 'No matching customers' : 'No customers yet'}
            description={
              query
                ? 'Try a different name or number.'
                : 'Add your first customer to start taking orders.'
            }
            action={
              !query && <ButtonLink href="/customers/new">Add customer</ButtonLink>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">WhatsApp</th>
                  <th className="px-4 py-2.5 font-medium">Social</th>
                  <th className="px-4 py-2.5 font-medium">City</th>
                  <th className="px-4 py-2.5 text-right font-medium">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {c.name}
                      </Link>
                      {!c.active && (
                        <Badge className="ml-2 border-slate-200 bg-slate-100">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{c.whatsappNumber}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {c.instagram ?? c.tiktok ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.city ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {c.orderCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
