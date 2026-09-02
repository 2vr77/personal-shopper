'use client'

import type { OrderStatus } from '@prisma/client'
import { useActionState } from 'react'

import { changeOrderStatus } from '@/app/actions/orders'
import { Button, Field, FormError, Input, Select } from '@/components/ui'
import { ORDER_STATUS_LABEL } from '@/lib/order-status'

export function StatusForm({
  orderId,
  options,
}: {
  orderId: string
  options: OrderStatus[]
}) {
  const [state, action, pending] = useActionState(changeOrderStatus, undefined)

  return (
    <form action={action} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <FormError message={state?.ok ? undefined : state?.message} />
      {state?.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}

      <Field label="Move to" htmlFor="status">
        <Select id="status" name="status" defaultValue="" required>
          <option value="" disabled>
            Choose a status…
          </option>
          {options.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Note" htmlFor="note">
        <Input id="note" name="note" placeholder="Optional — why the change?" />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Update status'}
      </Button>
    </form>
  )
}
