'use client'

import { useActionState, useState } from 'react'
import { AllocationMethod } from '@prisma/client'

import { updateCargoAllocation } from '@/app/actions/cargo'
import { Button, Card, Field, FormError, Input, Select } from '@/components/ui'
import { humanize } from '@/lib/utils'

type CargoOrderRow = {
  orderId: string
  orderNumber: string
  allocatedCost: number
}

export function AllocationForm({
  cargoBatchId,
  totalCost,
  allocationMethod,
  cargoOrders,
}: {
  cargoBatchId: string
  totalCost: number
  allocationMethod: AllocationMethod
  cargoOrders: CargoOrderRow[]
}) {
  const [state, action, pending] = useActionState(updateCargoAllocation, undefined)
  const [method, setMethod] = useState<AllocationMethod>(allocationMethod)

  return (
    <Card>
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-medium">Cost & allocation</h2>
      </div>
      <form action={action} className="flex flex-col gap-4 p-4">
        <input type="hidden" name="cargoBatchId" value={cargoBatchId} />
        <FormError message={state?.ok ? undefined : state?.message} />
        {state?.ok && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.message}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Total freight cost (MYR)" htmlFor="totalCost">
            <Input
              id="totalCost"
              name="totalCost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={totalCost}
              required
            />
          </Field>
          <Field label="Allocation method" htmlFor="allocationMethod">
            <Select
              id="allocationMethod"
              name="allocationMethod"
              value={method}
              onChange={(e) => setMethod(e.target.value as AllocationMethod)}
            >
              {Object.values(AllocationMethod).map((m) => (
                <option key={m} value={m}>
                  {humanize(m)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {method === AllocationMethod.MANUAL && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Per-order amount (MYR)</p>
            {cargoOrders.map((co) => (
              <div key={co.orderId} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-muted">{co.orderNumber}</span>
                <Input
                  name={`manual_${co.orderId}`}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={co.allocatedCost}
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Calculating…' : 'Recalculate allocation'}
          </Button>
        </div>

        {method !== AllocationMethod.MANUAL && (
          <p className="text-xs text-muted">
            {method === AllocationMethod.EQUAL &&
              'Split evenly across every order in this batch.'}
            {method === AllocationMethod.WEIGHT &&
              'Split by each order’s weight. Orders without a weight fall back to an even split.'}
            {method === AllocationMethod.ITEM_COUNT &&
              'Split by how many line items are on each order.'}
          </p>
        )}
      </form>
    </Card>
  )
}
