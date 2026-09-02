'use client'

import { useActionState } from 'react'

import { createPurchaseBatch } from '@/app/actions/purchasing'
import { Button, Card, Field, FormError, Input, Textarea } from '@/components/ui'

export function PurchaseBatchForm() {
  const [state, action, pending] = useActionState(createPurchaseBatch, undefined)

  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4">
        <FormError message={state?.message} />

        <Field label="Label" htmlFor="label" error={state?.fieldErrors?.label}>
          <Input id="label" name="label" placeholder="September Bangkok trip" required />
        </Field>

        <Field label="Trip date" htmlFor="tripDate" error={state?.fieldErrors?.tripDate}>
          <Input
            id="tripDate"
            name="tripDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </Field>

        <Field label="Notes" htmlFor="notes" error={state?.fieldErrors?.notes}>
          <Textarea id="notes" name="notes" />
        </Field>

        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? 'Creating…' : 'Create trip'}
        </Button>
      </form>
    </Card>
  )
}
