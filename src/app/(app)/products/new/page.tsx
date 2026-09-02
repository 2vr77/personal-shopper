import type { Metadata } from 'next'
import { Role } from '@prisma/client'

import { createProduct } from '@/app/actions/products'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'

import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: 'Add product · Personal Shopper' }

export default async function NewProductPage() {
  await requireRole(Role.STAFF)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Add product"
        description="Colours and sizes are added once the product exists."
      />
      <ProductForm action={createProduct} submitLabel="Create product" />
    </div>
  )
}
