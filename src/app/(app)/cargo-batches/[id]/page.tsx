import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CargoStatus } from '@prisma/client'

import { addOrdersToCargo, markCargoArrived } from '@/app/actions/cargo'
import { StatusBadge, Badge } from '@/components/status-badge'
import { Button, Card, EmptyState, Input, PageHeader } from '@/components/ui'
import { hasRole, requireUser } from '@/lib/dal'
import { formatMYR } from '@/lib/money'
import { getCargoBatch, ordersAwaitingCargo } from '@/lib/queries/cargo'
import { formatDate, humanize } from '@/lib/utils'

import { AllocationForm } from './allocation-form'

export async function generateMetadata(props: PageProps<'/cargo-batches/[id]'>) {
  const { id } = await props.params
  const batch = await getCargoBatch(id)
  return { title: `${batch?.label ?? 'Cargo batch'} · Personal Shopper` }
}

export default async function CargoBatchDetailPage(props: PageProps<'/cargo-batches/[id]'>) {
  const user = await requireUser()
  const { id } = await props.params
  const batch = await getCargoBatch(id)
  if (!batch) notFound()

  const canEdit = hasRole(user, 'STAFF')
  const isArrived = batch.status === CargoStatus.ARRIVED || batch.status === CargoStatus.CLOSED
  const awaitingOrders = canEdit && !isArrived ? await ordersAwaitingCargo() : []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={batch.label}
        description={`${batch.origin} → ${batch.destination} · ${
          batch.shipDate ? formatDate(batch.shipDate) : 'No ship date yet'
        }`}
        actions={
          <>
            <Badge>{humanize(batch.status)}</Badge>
            {canEdit && !isArrived && batch.cargoOrders.length > 0 && (
              <form action={markCargoArrived}>
                <input type="hidden" name="cargoBatchId" value={batch.id} />
                <Button type="submit">Mark arrived in Malaysia</Button>
              </form>
            )}
          </>
        }
      />

      {canEdit && !isArrived && (
        <Card>
          <div className="border-b border-line px-4 py-3">
            <h2 className="font-medium">Add purchased orders to this shipment</h2>
          </div>
          {awaitingOrders.length === 0 ? (
            <EmptyState
              title="No orders waiting"
              description="Orders appear here once every item on them has been purchased."
            />
          ) : (
            <form action={addOrdersToCargo} className="p-4">
              <input type="hidden" name="cargoBatchId" value={batch.id} />
              <ul className="divide-y divide-line">
                {awaitingOrders.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      name="orderIds"
                      value={order.id}
                      className="size-4 shrink-0 rounded border-line"
                    />
                    <span className="font-medium">{order.orderNumber}</span>
                    <span className="text-muted">{order.customer.name}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-muted">Weight (kg)</span>
                      <Input
                        name={`weight_${order.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-24"
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <Button type="submit" className="mt-3">
                Add to shipment
              </Button>
            </form>
          )}
        </Card>
      )}

      <Card>
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-medium">Orders in this shipment</h2>
        </div>
        {batch.cargoOrders.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Order</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Weight</th>
                  <th className="px-4 py-2 text-right font-medium">Allocated cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {batch.cargoOrders.map((co) => (
                  <tr key={co.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/orders/${co.order.id}`} className="font-medium hover:underline">
                        {co.order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted">{co.order.customer.name}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={co.order.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                      {co.weight ? `${co.weight} kg` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatMYR(co.allocatedCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canEdit && batch.cargoOrders.length > 0 && (
        <AllocationForm
          cargoBatchId={batch.id}
          totalCost={batch.totalCost}
          allocationMethod={batch.allocationMethod}
          cargoOrders={batch.cargoOrders.map((co) => ({
            orderId: co.orderId,
            orderNumber: co.order.orderNumber,
            allocatedCost: co.allocatedCost,
          }))}
        />
      )}
    </div>
  )
}
