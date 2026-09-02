import Link from 'next/link'
import { notFound } from 'next/navigation'

import { addOrdersToCargo } from '@/app/actions/cargo'
import { decidePayment } from '@/app/actions/payments'
import { addOrdersToPurchaseBatch } from '@/app/actions/purchasing'
import { Badge, StatusBadge } from '@/components/status-badge'
import { Button, Card, DetailRow, EmptyState, Field, PageHeader, Select } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import {
  ORDER_STATUS_LABEL,
  allowedTransitions,
  progressRatio,
} from '@/lib/order-status'
import { listCargoBatches } from '@/lib/queries/cargo'
import { estimateMargin, getOrder } from '@/lib/queries/orders'
import { listPurchaseBatches } from '@/lib/queries/purchasing'
import { cn, formatDateTime, humanize } from '@/lib/utils'

import { PaymentForm } from './payment-form'
import { StatusForm } from './status-form'

const PAYMENT_STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
}

export async function generateMetadata(props: PageProps<'/orders/[id]'>) {
  const { id } = await props.params
  const order = await getOrder(id)
  return { title: `${order?.orderNumber ?? 'Order'} · Personal Shopper` }
}

export default async function OrderDetailPage(props: PageProps<'/orders/[id]'>) {
  const user = await requireUser()
  const { id } = await props.params
  const order = await getOrder(id)
  if (!order) notFound()

  const canEdit = hasRole(user, 'STAFF')
  const margin = estimateMargin(order)
  const transitions = allowedTransitions(order.status)
  const progress = Math.round(progressRatio(order.status) * 100)

  const canAssignTrip = canEdit && order.status === 'PAYMENT_VERIFIED' && !order.purchaseBatch
  const canAssignCargo = canEdit && order.status === 'PURCHASED' && !order.cargoBatch

  const openPurchaseBatches = canAssignTrip
    ? (await listPurchaseBatches()).filter((b) => !b.closedAt)
    : []
  const openCargoBatches = canAssignCargo
    ? (await listCargoBatches()).filter((b) => b.status !== 'ARRIVED' && b.status !== 'CLOSED')
    : []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={order.orderNumber}
        description={`Created ${formatDateTime(order.createdAt)} by ${order.createdBy.name}`}
        actions={<StatusBadge status={order.status} className="text-sm" />}
      />

      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{ORDER_STATUS_LABEL[order.status]}</span>
          <span className="text-muted">{progress}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Order progress"
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-medium">Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Unit</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/products/${item.product.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-xs text-muted">
                          {item.variant
                            ? [item.variant.color, item.variant.size]
                                .filter(Boolean)
                                .join(' · ')
                            : item.product.sku}
                        </p>
                        {item.notes && (
                          <p className="mt-0.5 text-xs italic text-muted">
                            {item.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {item.qty}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {formatMYR(item.sellingPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                        {formatMYR(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line px-4 py-3">
              <dl className="ml-auto max-w-xs">
                <DetailRow label="Subtotal">{formatMYR(order.subtotal)}</DetailRow>
                <DetailRow label="Discount">−{formatMYR(order.discount)}</DetailRow>
                <DetailRow label="Cargo fee">{formatMYR(order.cargoFee)}</DetailRow>
                <DetailRow label="Shipping fee">
                  {formatMYR(order.shippingFee)}
                </DetailRow>
                <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatMYR(order.total)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {order.notes && (
            <Card className="p-4">
              <h2 className="mb-2 font-medium">Notes</h2>
              <p className="whitespace-pre-wrap text-sm text-muted">{order.notes}</p>
            </Card>
          )}

          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-medium">Timeline</h2>
            </div>
            <ol className="divide-y divide-line">
              {order.statusHistory.map((entry) => (
                <li key={entry.id} className="flex gap-3 px-4 py-3">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {ORDER_STATUS_LABEL[entry.toStatus]}
                      </span>
                      {entry.fromStatus && (
                        <span className="text-muted">
                          {' '}
                          · from {ORDER_STATUS_LABEL[entry.fromStatus]}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(entry.createdAt)}
                      {entry.changedBy && ` · ${entry.changedBy.name}`}
                    </p>
                    {entry.note && (
                      <p className="mt-1 text-sm text-slate-600">{entry.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-medium">Customer</h2>
            </div>
            <div className="p-4">
              <Link
                href={`/customers/${order.customer.id}`}
                className="font-medium text-accent hover:underline"
              >
                {order.customer.name}
              </Link>
              <p className="mt-1 text-sm tabular-nums text-muted">
                {order.customer.whatsappNumber}
              </p>
              {order.customer.addressLine1 && (
                <address className="mt-3 text-sm not-italic text-muted">
                  {order.customer.addressLine1}
                  {order.customer.addressLine2 && (
                    <>
                      <br />
                      {order.customer.addressLine2}
                    </>
                  )}
                  <br />
                  {[
                    order.customer.postcode,
                    order.customer.city,
                    order.customer.state,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </address>
              )}
            </div>
          </Card>

          {(canAssignTrip || canAssignCargo) && (
            <Card className="p-4">
              <h2 className="mb-2 font-medium">Assign to trip / cargo</h2>
              {canAssignTrip && (
                openPurchaseBatches.length > 0 ? (
                  <form action={addOrdersToPurchaseBatch} className="flex flex-col gap-3">
                    <input type="hidden" name="orderIds" value={order.id} />
                    <Field label="Purchase trip" htmlFor="batchId">
                      <Select id="batchId" name="batchId" defaultValue="" required>
                        <option value="" disabled>
                          Choose a trip…
                        </option>
                        {openPurchaseBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button type="submit">Assign to trip</Button>
                  </form>
                ) : (
                  <EmptyState title="No open purchase trips" description="Create a purchase trip first." />
                )
              )}
              {canAssignCargo && (
                openCargoBatches.length > 0 ? (
                  <form action={addOrdersToCargo} className="flex flex-col gap-3">
                    <input type="hidden" name="orderIds" value={order.id} />
                    <Field label="Cargo shipment" htmlFor="cargoBatchId">
                      <Select id="cargoBatchId" name="cargoBatchId" defaultValue="" required>
                        <option value="" disabled>
                          Choose a shipment…
                        </option>
                        {openCargoBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Button type="submit">Assign to cargo</Button>
                  </form>
                ) : (
                  <EmptyState title="No open cargo shipments" description="Create a cargo shipment first." />
                )
              )}
            </Card>
          )}

          {(order.purchaseBatch || order.cargoBatch) && (
            <Card className="p-4">
              <h2 className="mb-2 font-medium">Sourcing</h2>
              <dl className="divide-y divide-line">
                {order.purchaseBatch && (
                  <DetailRow label="Purchase trip">
                    <Link
                      href={`/purchase-batches/${order.purchaseBatch.id}`}
                      className="text-accent hover:underline"
                    >
                      {order.purchaseBatch.label}
                    </Link>
                  </DetailRow>
                )}
                {order.cargoBatch && (
                  <>
                    <DetailRow label="Cargo batch">
                      <Link
                        href={`/cargo-batches/${order.cargoBatch.id}`}
                        className="text-accent hover:underline"
                      >
                        {order.cargoBatch.label}
                      </Link>
                    </DetailRow>
                    {order.cargoWeight !== null && (
                      <DetailRow label="Weight">{order.cargoWeight} kg</DetailRow>
                    )}
                    {order.cargoAllocatedCost !== null && (
                      <DetailRow label="Allocated freight">
                        {formatMYR(order.cargoAllocatedCost)}
                      </DetailRow>
                    )}
                  </>
                )}
              </dl>
            </Card>
          )}

          {order.shipment && (
            <Card className="p-4">
              <h2 className="mb-2 font-medium">Shipping</h2>
              <dl className="divide-y divide-line">
                <DetailRow label="Courier">{order.shipment.courier}</DetailRow>
                <DetailRow label="Tracking">
                  {order.shipment.trackingNumber ?? '—'}
                </DetailRow>
                <DetailRow label="Status">{humanize(order.shipment.status)}</DetailRow>
                {order.shipment.deliveredAt && (
                  <DetailRow label="Delivered">
                    {formatDateTime(order.shipment.deliveredAt)}
                  </DetailRow>
                )}
              </dl>
              <Link href="/shipping" className="mt-3 inline-block text-xs text-accent hover:underline">
                Manage in Shipping →
              </Link>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-medium">Payments</h2>
              <span className="text-sm text-muted">
                {formatMYR(
                  order.payments
                    .filter((p) => p.status === 'VERIFIED')
                    .reduce((sum, p) => sum + p.amount, 0)
                )}{' '}
                verified
              </span>
            </div>

            {order.payments.length === 0 ? (
              <EmptyState title="No payments recorded yet" />
            ) : (
              <ul className="divide-y divide-line">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium tabular-nums">
                        {formatMYR(payment.amount)}
                      </span>
                      <Badge className={cn(PAYMENT_STATUS_TONE[payment.status])}>
                        {humanize(payment.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {humanize(payment.method)}
                      {payment.reference && ` · ${payment.reference}`} ·{' '}
                      {formatDateTime(payment.createdAt)}
                    </p>
                    {payment.receipts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {payment.receipts.map((r) => (
                          <a
                            key={r.id}
                            href={r.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            {r.fileName ?? 'Receipt'}
                          </a>
                        ))}
                      </div>
                    )}
                    {canEdit && payment.status === 'PENDING' && (
                      <div className="mt-1 flex gap-2">
                        <form action={decidePayment}>
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <input type="hidden" name="decision" value="VERIFIED" />
                          <Button type="submit" variant="secondary" className="px-2.5 py-1 text-xs">
                            Verify
                          </Button>
                        </form>
                        <form action={decidePayment}>
                          <input type="hidden" name="paymentId" value={payment.id} />
                          <input type="hidden" name="decision" value="REJECTED" />
                          <Button type="submit" variant="danger" className="px-2.5 py-1 text-xs">
                            Reject
                          </Button>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && <PaymentForm orderId={order.id} />}
          </Card>

          {canEdit && (
            <Card>
              <div className="border-b border-line px-4 py-3">
                <h2 className="font-medium">Update status</h2>
              </div>
              <StatusForm orderId={order.id} options={transitions} />
            </Card>
          )}

          <Card className="p-4">
            <h2 className="mb-2 font-medium">Estimated margin</h2>
            <dl className="divide-y divide-line">
              <DetailRow label="Revenue">{formatMYR(margin.revenue)}</DetailRow>
              <DetailRow label="Goods cost">{formatMYR(margin.cost)}</DetailRow>
              <DetailRow label="Profit">
                <span
                  className={margin.profit < 0 ? 'text-red-600' : 'text-emerald-700'}
                >
                  {formatMYR(margin.profit)}
                </span>
              </DetailRow>
            </dl>
            <p className="mt-3 text-xs text-muted">
              {margin.isActual
                ? 'Based on the actual price paid on the shopping trip.'
                : 'Based on catalogue cost — updates once items are purchased.'}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
