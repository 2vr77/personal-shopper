import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/status-badge'
import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { listProducts } from '@/lib/queries/catalog'

export const metadata: Metadata = { title: 'Products · Personal Shopper' }

export default async function ProductsPage(props: PageProps<'/products'>) {
  await requireUser()
  const searchParams = await props.searchParams
  const query = typeof searchParams.q === 'string' ? searchParams.q : undefined

  const products = await listProducts(query)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description={
          query
            ? `${products.length} match${products.length === 1 ? '' : 'es'} for “${query}”`
            : `${products.length} product${products.length === 1 ? '' : 's'}`
        }
        actions={<ButtonLink href="/products/new">Add product</ButtonLink>}
      />

      <Card>
        {products.length === 0 ? (
          <EmptyState
            title={query ? 'No matching products' : 'No products yet'}
            description={
              query
                ? 'Try a different name, SKU or category.'
                : 'Add the items you source so they can be added to orders.'
            }
            action={!query && <ButtonLink href="/products/new">Add product</ButtonLink>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                  <th className="px-4 py-2.5 text-right font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.variantCount > 0 && (
                        <Badge className="ml-2">{p.variantCount} variants</Badge>
                      )}
                      {!p.active && (
                        <Badge className="ml-2 border-slate-200 bg-slate-100">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">
                      {p.sku}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{p.category ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                      {formatMYR(p.purchasePrice)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatMYR(p.sellingPrice)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${
                        p.margin < 0 ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatMYR(p.margin)}
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
