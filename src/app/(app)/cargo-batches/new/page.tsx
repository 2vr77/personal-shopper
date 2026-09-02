import type { Metadata } from 'next'
import { Role } from '@prisma/client'

import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'

import { CargoBatchForm } from './cargo-batch-form'

export const metadata: Metadata = { title: 'New cargo batch · Personal Shopper' }

export default async function NewCargoBatchPage() {
  await requireRole(Role.STAFF)

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title="New cargo batch" />
      <CargoBatchForm />
    </div>
  )
}
