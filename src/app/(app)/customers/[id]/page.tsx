import Link from 'next/link'
import { notFound } from 'next/navigation'

import { updateCustomer } from '@/app/actions/customers'
import { StatusBadge } from '@/components/status-badge'
import { Card, DetailRow, EmptyState, PageHeader } from '@/components/ui'
import { requireUser, hasRole } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { getCustomer } from '@/lib/queries/catalog'
import { formatDate } from '@/lib/utils'

import { CustomerForm } from '../customer-form'

export async function generateMetadata(props: PageProps<'/customers/[id]'>) {
  const { id } = await props.params
  const customer = await getCustomer(id)
  return { title: `${customer?.name ?? 'Customer'} · Personal Shopper` }
}

export default async function CustomerDetailPage(
  props: PageProps<'/customers/[id]'>
) {
  const user = await requireUser()
  const { id } = await props.params
  const customer = await getCustomer(id)
  if (!customer) notFound()

  const canEdit = hasRole(user, 'STAFF')
  // Bind the id so the form action keeps the `(prev, formData)` shape that
  // `useActionState` expects.
  const action = updateCustomer.bind(null, customer.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={customer.name}
        description={`${customer.whatsappNumber} · joined ${formatDate(customer.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="order-2 lg:order-1">
          {canEdit ? (
            <CustomerForm
              action={action}
              submitLabel="Save changes"
              defaults={{
                name: customer.name,
                whatsappNumber: customer.whatsappNumber,
                tiktok: customer.tiktok,
                instagram: customer.instagram,
                addressLine1: customer.addressLine1,
                addressLine2: customer.addressLine2,
                city: customer.city,
                state: customer.state,
                postcode: customer.postcode,
                notes: customer.notes,
                active: customer.active,
              }}
            />
          ) : (
            <Card className="p-6">
              <dl className="divide-y divide-line">
                <DetailRow label="WhatsApp">{customer.whatsappNumber}</DetailRow>
                <DetailRow label="Instagram">{customer.instagram ?? '—'}</DetailRow>
                <DetailRow label="TikTok">{customer.tiktok ?? '—'}</DetailRow>
                <DetailRow label="City">{customer.city ?? '—'}</DetailRow>
                <DetailRow label="State">{customer.state ?? '—'}</DetailRow>
              </dl>
              {customer.notes && (
                <p className="mt-4 whitespace-pre-wrap text-sm text-muted">
                  {customer.notes}
                </p>
              )}
            </Card>
          )}
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <Card className="p-4">
            <dl className="divide-y divide-line">
              <DetailRow label="Orders">{customer.orders.length}</DetailRow>
              <DetailRow label="Lifetime value">
                {formatMYR(customer.lifetimeValue)}
              </DetailRow>
            </dl>
          </Card>

          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-medium">Order history</h2>
            </div>
            {customer.orders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <ul className="divide-y divide-line">
                {customer.orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={order.status} />
                        <span className="text-xs tabular-nums text-muted">
                          {formatMYR(order.total)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
