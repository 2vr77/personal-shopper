'use client'

import { useActionState } from 'react'

import { importTrackingCsv } from '@/app/actions/shipping'
import { Button, Field, FormError } from '@/components/ui'

export function ImportTrackingForm() {
  const [state, action, pending] = useActionState(importTrackingCsv, undefined)

  return (
    <form action={action} className="flex flex-col gap-3 border-t border-line p-4">
      <FormError message={state?.ok ? undefined : state?.message} />
      {state?.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}

      <Field
        label="Tracking CSV"
        htmlFor="file"
        hint="Columns: Order Reference, Tracking Number, and optionally Weight (kg) / Shipping Cost."
      >
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm"
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import tracking numbers'}
        </Button>
      </div>
    </form>
  )
}
