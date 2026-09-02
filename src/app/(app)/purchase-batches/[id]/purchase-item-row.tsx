'use client'

import { useActionState } from 'react'
import { PurchaseItemStatus } from '@prisma/client'

import { updatePurchaseItem } from '@/app/actions/purchasing'
import { Button, Input, Select } from '@/components/ui'

const STATUS_LABEL: Record<PurchaseItemStatus, string> = {
  PENDING: 'Pending',
  PURCHASED: 'Purchased',
  UNAVAILABLE: 'Unavailable',
  WRONG_VARIANT: 'Wrong variant',
}

export function PurchaseItemRow({
  purchaseItemId,
  defaults,
  disabled,
}: {
  purchaseItemId: string
  defaults: {
    status: PurchaseItemStatus
    actualCost: number | null
    store: string | null
    note: string | null
  }
  disabled: boolean
}) {
  const [state, action, pending] = useActionState(updatePurchaseItem, undefined)

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-12 sm:items-center">
      <input type="hidden" name="purchaseItemId" value={purchaseItemId} />

      <div className="sm:col-span-3">
        <Select name="status" defaultValue={defaults.status} disabled={disabled}>
          {Object.values(PurchaseItemStatus).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Input
          name="actualCost"
          type="number"
          step="0.01"
          min="0"
          placeholder="Actual cost"
          defaultValue={defaults.actualCost ?? ''}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-2">
        <Input
          name="store"
          placeholder="Store"
          defaultValue={defaults.store ?? ''}
          disabled={disabled}
        />
      </div>
      <div className="sm:col-span-3">
        <Input
          name="note"
          placeholder="Note"
          defaultValue={defaults.note ?? ''}
          disabled={disabled}
        />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={disabled}
          className="w-full text-xs"
        />
        <Button type="submit" variant="secondary" disabled={disabled || pending} className="shrink-0">
          {pending ? '…' : 'Save'}
        </Button>
      </div>

      {state?.message && !state.ok && (
        <p className="text-xs text-red-600 sm:col-span-12">{state.message}</p>
      )}
    </form>
  )
}
