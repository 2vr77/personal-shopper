'use client'

import { useActionState } from 'react'

import { Button, Card, Field, FormError, Input, Textarea } from '@/components/ui'
import type { ActionState } from '@/lib/validation'

export type CustomerFormValues = {
  name: string
  whatsappNumber: string
  tiktok: string | null
  instagram: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postcode: string | null
  notes: string | null
  active: boolean
}

const EMPTY: CustomerFormValues = {
  name: '',
  whatsappNumber: '',
  tiktok: null,
  instagram: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postcode: null,
  notes: null,
  active: true,
}

export function CustomerForm({
  action,
  defaults = EMPTY,
  submitLabel,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData
  ) => Promise<ActionState>
  defaults?: CustomerFormValues
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" error={errors?.name}>
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </Field>
          <Field
            label="WhatsApp number"
            htmlFor="whatsappNumber"
            error={errors?.whatsappNumber}
            hint="Local format is fine — 012-345 6789 becomes +60123456789."
          >
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              inputMode="tel"
              defaultValue={defaults.whatsappNumber}
              required
            />
          </Field>
          <Field label="Instagram" htmlFor="instagram" error={errors?.instagram}>
            <Input
              id="instagram"
              name="instagram"
              placeholder="@handle"
              defaultValue={defaults.instagram ?? ''}
            />
          </Field>
          <Field label="TikTok" htmlFor="tiktok" error={errors?.tiktok}>
            <Input
              id="tiktok"
              name="tiktok"
              placeholder="@handle"
              defaultValue={defaults.tiktok ?? ''}
            />
          </Field>
        </div>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-medium">Delivery address</legend>
          <Field
            label="Address line 1"
            htmlFor="addressLine1"
            error={errors?.addressLine1}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine1"
              name="addressLine1"
              defaultValue={defaults.addressLine1 ?? ''}
            />
          </Field>
          <Field
            label="Address line 2"
            htmlFor="addressLine2"
            error={errors?.addressLine2}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine2"
              name="addressLine2"
              defaultValue={defaults.addressLine2 ?? ''}
            />
          </Field>
          <Field label="City" htmlFor="city" error={errors?.city}>
            <Input id="city" name="city" defaultValue={defaults.city ?? ''} />
          </Field>
          <Field label="State" htmlFor="state" error={errors?.state}>
            <Input id="state" name="state" defaultValue={defaults.state ?? ''} />
          </Field>
          <Field label="Postcode" htmlFor="postcode" error={errors?.postcode}>
            <Input
              id="postcode"
              name="postcode"
              inputMode="numeric"
              defaultValue={defaults.postcode ?? ''}
            />
          </Field>
        </fieldset>

        <Field label="Notes" htmlFor="notes" error={errors?.notes}>
          <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ''} />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaults.active}
            className="size-4 rounded border-line"
          />
          Active customer
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
