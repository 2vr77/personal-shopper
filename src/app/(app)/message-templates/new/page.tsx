import type { Metadata } from 'next'
import { Role } from '@prisma/client'

import { createTemplate } from '@/app/actions/whatsapp'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'

import { TemplateForm } from '../template-form'

export const metadata: Metadata = { title: 'New template · Personal Shopper' }

export default async function NewTemplatePage() {
  await requireRole(Role.STAFF)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="New message template" />
      <TemplateForm action={createTemplate} submitLabel="Create template" />
    </div>
  )
}
