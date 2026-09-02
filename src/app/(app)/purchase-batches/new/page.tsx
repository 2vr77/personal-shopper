import type { Metadata } from 'next'
import { Role } from '@prisma/client'

import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'

import { PurchaseBatchForm } from './purchase-batch-form'

export const metadata: Metadata = { title: 'New purchase trip · Personal Shopper' }

export default async function NewPurchaseBatchPage() {
  await requireRole(Role.STAFF)

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title="New purchase trip" />
      <PurchaseBatchForm />
    </div>
  )
}
