'use client'

import { useActionState } from 'react'
import { AllocationMethod } from '@prisma/client'

import { createCargoBatch } from '@/app/actions/cargo'
import { Button, Card, Field, FormError, Input, Select, Textarea } from '@/components/ui'
import { humanize } from '@/lib/utils'

export function CargoBatchForm() {
  const [state, action, pending] = useActionState(createCargoBatch, undefined)

  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4">
        <FormError message={state?.message} />

        <Field label="Label" htmlFor="label" error={state?.fieldErrors?.label}>
          <Input id="label" name="label" placeholder="Sept batch #1" required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ship date" htmlFor="shipDate" error={state?.fieldErrors?.shipDate}>
            <Input id="shipDate" name="shipDate" type="date" />
          </Field>
          <Field
            label="Expected arrival"
            htmlFor="expectedArrival"
            error={state?.fieldErrors?.expectedArrival}
          >
            <Input id="expectedArrival" name="expectedArrival" type="date" />
          </Field>
        </div>

        <Field
          label="Allocation method"
          htmlFor="allocationMethod"
          hint="How the total freight cost is split across orders. Can be changed later."
        >
          <Select id="allocationMethod" name="allocationMethod" defaultValue="WEIGHT">
            {Object.values(AllocationMethod).map((m) => (
              <option key={m} value={m}>
                {humanize(m)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes" htmlFor="notes" error={state?.fieldErrors?.notes}>
          <Textarea id="notes" name="notes" />
        </Field>

        <Button type="submit" disabled={pending} className="mt-1">
          {pending ? 'Creating…' : 'Create batch'}
        </Button>
      </form>
    </Card>
  )
}
