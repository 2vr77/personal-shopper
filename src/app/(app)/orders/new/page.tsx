import type { Metadata } from 'next'
import { Role } from '@prisma/client'

import { ButtonLink, Card, EmptyState, PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'
import { customerOptions, productOptions } from '@/lib/queries/catalog'

import { OrderForm } from './order-form'

export const metadata: Metadata = { title: 'New order · Personal Shopper' }

export default async function NewOrderPage() {
  await requireRole(Role.STAFF)

  const [customers, products] = await Promise.all([
    customerOptions(),
    productOptions(),
  ])

  // An order needs both sides to exist; say so rather than showing empty pickers.
  if (customers.length === 0 || products.length === 0) {
    const missing = customers.length === 0 ? 'customer' : 'product'
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="New order" />
        <Card>
          <EmptyState
            title={`Add a ${missing} first`}
            description={`You need at least one active ${missing} before you can create an order.`}
            action={
              <ButtonLink href={customers.length === 0 ? '/customers/new' : '/products/new'}>
                Add {missing}
              </ButtonLink>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New order"
        description="The order number is assigned automatically once you save."
      />
      <OrderForm customers={customers} products={products} />
    </div>
  )
}
