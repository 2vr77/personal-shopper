import type { Metadata } from 'next'
import { Role } from '@prisma/client'

import { updateAutomationSettings } from '@/app/actions/whatsapp'
import { Button, Card, PageHeader } from '@/components/ui'
import { requireRole } from '@/lib/dal'
import { getAutomationSettings } from '@/lib/whatsapp/automation'
import { isWhatsAppConnected } from '@/lib/whatsapp'
import { CreateUserForm } from './create-user-form'

export const metadata: Metadata = { title: 'Settings · Personal Shopper' }

export default async function SettingsPage() {
  await requireRole(Role.ADMIN)
  const settings = await getAutomationSettings()

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title="Settings" />

      <Card className="p-6">
        <h2 className="mb-1 font-medium">User Management</h2>
        <p className="mb-4 text-sm text-muted">
          Create new user accounts for staff and shoppers.
        </p>
        <CreateUserForm />
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 font-medium">WhatsApp automation</h2>
        <p className="mb-4 text-sm text-muted">
          {isWhatsAppConnected
            ? 'Connected to a live WhatsApp provider.'
            : 'No provider connected — messages will be logged but not delivered until a BSP is onboarded.'}
        </p>
        <form action={updateAutomationSettings} className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="whatsappEnabled"
              defaultChecked={settings.whatsappEnabled}
              className="size-4 rounded border-line"
            />
            Enable WhatsApp sending
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="notifyOnStatusChange"
              defaultChecked={settings.notifyOnStatusChange}
              className="size-4 rounded border-line"
            />
            Notify customers automatically on order status changes
          </label>
          <div>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
