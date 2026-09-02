import { notFound } from 'next/navigation'
import { Role } from '@prisma/client'

import { updateTemplate } from '@/app/actions/whatsapp'
import { PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'
import { getTemplate } from '@/lib/queries/whatsapp'

import { TemplateForm } from '../template-form'

export async function generateMetadata(props: PageProps<'/message-templates/[id]'>) {
  const { id } = await props.params
  const template = await getTemplate(id)
  return { title: `${template?.name ?? 'Template'} · Personal Shopper` }
}

export default async function EditTemplatePage(props: PageProps<'/message-templates/[id]'>) {
  await requireRole(Role.STAFF)
  const { id } = await props.params
  const template = await getTemplate(id)
  if (!template) notFound()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={template.name} description={template.key} />
      <TemplateForm
        action={updateTemplate.bind(null, template.id)}
        submitLabel="Save changes"
        defaults={{
          key: template.key,
          name: template.name,
          body: template.body,
          active: template.active,
        }}
      />
    </div>
  )
}
