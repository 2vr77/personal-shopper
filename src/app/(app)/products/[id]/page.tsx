import { notFound } from 'next/navigation'

import { deleteVariant, updateProduct } from '@/app/actions/products'
import { Badge } from '@/components/status-badge'
import { Card, DetailRow, EmptyState, PageHeader } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { getProduct } from '@/lib/queries/catalog'

import { ProductForm } from '../product-form'
import { VariantForm } from './variant-form'

export async function generateMetadata(props: PageProps<'/products/[id]'>) {
  const { id } = await props.params
  const product = await getProduct(id)
  return { title: `${product?.name ?? 'Product'} · Personal Shopper` }
}

export default async function ProductDetailPage(
  props: PageProps<'/products/[id]'>
) {
  const user = await requireUser()
  const { id } = await props.params
  const product = await getProduct(id)
  if (!product) notFound()

  const canEdit = hasRole(user, 'STAFF')
  const margin = product.sellingPrice - product.purchasePrice
  const marginPct =
    product.sellingPrice > 0 ? (margin / product.sellingPrice) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={product.name} description={product.sku} />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          {canEdit ? (
            <ProductForm
              action={updateProduct.bind(null, product.id)}
              submitLabel="Save changes"
              defaults={{
                name: product.name,
                sku: product.sku,
                category: product.category,
                supplier: product.supplier,
                purchasePrice: product.purchasePrice,
                sellingPrice: product.sellingPrice,
                active: product.active,
              }}
            />
          ) : (
            <Card className="p-6">
              <dl className="divide-y divide-line">
                <DetailRow label="Category">{product.category ?? '—'}</DetailRow>
                <DetailRow label="Supplier">{product.supplier ?? '—'}</DetailRow>
                <DetailRow label="Purchase price">
                  {formatMYR(product.purchasePrice)}
                </DetailRow>
                <DetailRow label="Selling price">
                  {formatMYR(product.sellingPrice)}
                </DetailRow>
              </dl>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-medium">Variants</h2>
              <span className="text-sm text-muted">
                {product.variants.filter((v) => v.active).length} active
              </span>
            </div>

            {product.variants.length === 0 ? (
              <EmptyState
                title="No variants"
                description="Add colours and sizes if this product comes in more than one."
              />
            ) : (
              <ul className="divide-y divide-line">
                {product.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {[variant.color, variant.size].filter(Boolean).join(' · ') ||
                          'Default'}
                      </span>
                      {variant.skuSuffix && (
                        <span className="font-mono text-xs text-muted">
                          {product.sku}
                          {variant.skuSuffix}
                        </span>
                      )}
                      {!variant.active && (
                        <Badge className="border-slate-200 bg-slate-100">
                          Retired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {variant.stockNote && (
                        <span className="hidden text-xs text-muted sm:inline">
                          {variant.stockNote}
                        </span>
                      )}
                      {canEdit && variant.active && (
                        <form action={deleteVariant}>
                          <input type="hidden" name="variantId" value={variant.id} />
                          <input type="hidden" name="productId" value={product.id} />
                          <button
                            type="submit"
                            className="text-xs text-muted hover:text-red-600 hover:underline"
                          >
                            Retire
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canEdit && <VariantForm productId={product.id} />}
          </Card>
        </div>

        <Card className="order-1 h-fit p-4 lg:order-2">
          <dl className="divide-y divide-line">
            <DetailRow label="Margin">
              <span className={margin < 0 ? 'text-red-600' : 'text-emerald-700'}>
                {formatMYR(margin)}
              </span>
            </DetailRow>
            <DetailRow label="Margin %">{marginPct.toFixed(1)}%</DetailRow>
            <DetailRow label="Times ordered">{product.timesOrdered}</DetailRow>
            <DetailRow label="Status">
              {product.active ? 'Active' : 'Inactive'}
            </DetailRow>
          </dl>
        </Card>
      </div>
    </div>
  )
}
