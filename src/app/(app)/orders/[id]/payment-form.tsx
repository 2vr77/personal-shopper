'use client'

import { useActionState } from 'react'
import { PaymentMethod } from '@prisma/client'

import { recordPayment } from '@/app/actions/payments'
import { Button, Field, FormError, Input, Select } from '@/components/ui'
import { humanize } from '@/lib/utils'

export function PaymentForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(recordPayment, undefined)

  return (
    <form action={action} className="flex flex-col gap-3 border-t border-line p-4">
      <input type="hidden" name="orderId" value={orderId} />
      <FormError message={state?.ok ? undefined : state?.message} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (MYR)" htmlFor="amount" error={state?.fieldErrors?.amount}>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
        </Field>
        <Field label="Method" htmlFor="method">
          <Select id="method" name="method" defaultValue="BANK_TRANSFER">
            {Object.values(PaymentMethod).map((m) => (
              <option key={m} value={m}>
                {humanize(m)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Reference" htmlFor="reference" error={state?.fieldErrors?.reference}>
        <Input id="reference" name="reference" placeholder="Bank ref / transaction ID" />
      </Field>

      <Field label="Receipt" htmlFor="receipt">
        <input
          id="receipt"
          name="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="text-sm"
        />
      </Field>

      <Field label="Note" htmlFor="note" error={state?.fieldErrors?.note}>
        <Input id="note" name="note" />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? 'Recording…' : 'Record payment'}
      </Button>
    </form>
  )
}
