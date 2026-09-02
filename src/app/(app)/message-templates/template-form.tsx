'use client'

import { useActionState } from 'react'

import { Button, Card, Field, FormError, Input, Textarea } from '@/components/ui'
import type { ActionState } from '@/lib/validation'

export type TemplateFormValues = {
  key: string
  name: string
  body: string
  active: boolean
}

const EMPTY: TemplateFormValues = { key: '', name: '', body: '', active: true }

export function TemplateForm({
  action,
  defaults = EMPTY,
  submitLabel,
}: {
  action: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>
  defaults?: TemplateFormValues
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const errors = state?.fieldErrors

  return (
    <Card className="p-6">
      <form action={formAction} className="flex flex-col gap-5">
        <FormError message={state?.ok ? undefined : state?.message} />
        {state?.ok && state.message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {state.message}
          </p>
        )}

        <Field
          label="Key"
          htmlFor="key"
          error={errors?.key}
          hint="Use status_<status> to fire automatically on that order status, e.g. status_payment_verified."
        >
          <Input id="key" name="key" defaultValue={defaults.key} className="font-mono" required />
        </Field>

        <Field label="Name" htmlFor="name" error={errors?.name}>
          <Input id="name" name="name" defaultValue={defaults.name} required />
        </Field>

        <Field
          label="Message"
          htmlFor="body"
          error={errors?.body}
          hint="Placeholders: {{customerName}}, {{orderNumber}}, {{status}}, {{total}}."
        >
          <Textarea id="body" name="body" defaultValue={defaults.body} required className="min-h-32" />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaults.active}
            className="size-4 rounded border-line"
          />
          Active
        </label>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  )
}
