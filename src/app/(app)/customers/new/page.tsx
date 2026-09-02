import type { Metadata } from 'next'
import { Role } from '@prisma/client'

import { createCustomer } from '@/app/actions/customers'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'

import { CustomerForm } from '../customer-form'

export const metadata: Metadata = { title: 'Add customer · Personal Shopper' }

export default async function NewCustomerPage() {
  await requireRole(Role.STAFF)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Add customer"
        description="Only a name and WhatsApp number are required."
      />
      <CustomerForm action={createCustomer} submitLabel="Create customer" />
    </div>
  )
}
