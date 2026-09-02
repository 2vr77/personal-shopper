import type { Metadata } from 'next'
import Link from 'next/link'

import { updateShipmentStatus } from '@/app/actions/shipping'
import { Badge } from '@/components/status-badge'
import { Button, ButtonLink, Card, EmptyState, PageHeader, Select } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { listShipments, ordersAwaitingShipment } from '@/lib/queries/shipping'
import { cn, formatDate, humanize } from '@/lib/utils'

import { ImportTrackingForm } from './import-tracking-form'

export const metadata: Metadata = { title: 'Shipping · Personal Shopper' }

const SHIPMENT_STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
  BOOKED: 'bg-sky-50 text-sky-800 border-sky-200',
  IN_TRANSIT: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  RETURNED: 'bg-amber-50 text-amber-800 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
}

const SHIPMENT_STATUSES = ['PENDING', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'FAILED']

export default async function ShippingPage() {
  const user = await requireUser()
  const canEdit = hasRole(user, 'STAFF')

  const [awaiting, shipments] = await Promise.all([
    ordersAwaitingShipment(),
    listShipments(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shipping"
        description="Book J&T shipments in bulk and track them through to delivery."
      />

      {canEdit && (
        <Card>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-medium">Ready to ship</h2>
            {awaiting.length > 0 && (
              <ButtonLink href="/api/shipping/export" variant="secondary">
                Export CSV ({awaiting.length})
              </ButtonLink>
            )}
          </div>
          {awaiting.length === 0 ? (
            <EmptyState
              title="Nothing waiting"
              description="Orders appear here once their cargo batch has arrived in Malaysia."
            />
          ) : (
            <ul className="divide-y divide-line">
              {awaiting.map((order) => (
                <li key={order.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                      {order.orderNumber}
                    </Link>
                    <span className="text-muted"> · {order.customer.name}</span>
                  </div>
                  <span className="text-muted">
                    {order.weight ? `${order.weight} kg · ` : ''}
                    {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-4 py-3 text-xs text-muted">
            Export, upload to the J&T bulk-booking portal, then import the tracking numbers
            it returns using the form below.
          </p>
          <ImportTrackingForm />
        </Card>
      )}

      <Card>
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-medium">Shipments</h2>
        </div>
        {shipments.length === 0 ? (
          <EmptyState title="No shipments booked yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Tracking</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Cost</th>
                  <th className="px-4 py-2 font-medium">Booked</th>
                  {canEdit && <th className="px-4 py-2 font-medium">Update</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shipments.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/orders/${s.order.id}`} className="font-medium hover:underline">
                        {s.order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted">{s.order.customer.name}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs">{s.trackingNumber ?? '—'}</span>
                      <p className="text-xs text-muted">{s.courier}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={cn(SHIPMENT_STATUS_TONE[s.status])}>
                        {humanize(s.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMYR(s.cost)}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {s.bookedAt ? formatDate(s.bookedAt) : '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-2.5">
                        <form action={updateShipmentStatus} className="flex items-center gap-2">
                          <input type="hidden" name="shipmentId" value={s.id} />
                          <Select name="status" defaultValue={s.status} className="w-32 py-1 text-xs">
                            {SHIPMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {humanize(status)}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="secondary" className="px-2.5 py-1 text-xs">
                            Save
                          </Button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
