'use client'

import { useActionState } from 'react'

import { Button, Card, Field, FormError, Input } from '@/components/ui'
import type { ActionState } from '@/lib/validation'

export type ProductFormValues = {
  name: string
  sku: string
  category: string | null
  supplier: string | null
  purchasePrice: number
  sellingPrice: number
  active: boolean
}

const EMPTY: ProductFormValues = {
  name: '',
  sku: '',
  category: null,
  supplier: null,
  purchasePrice: 0,
  sellingPrice: 0,
  active: true,
}

export function ProductForm({
  action,
  defaults = EMPTY,
  submitLabel,
}: {
  action: (
    prev: ActionState | undefined,
    formData: FormData
  ) => Promise<ActionState>
  defaults?: ProductFormValues
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
          <Field
            label="Name"
            htmlFor="name"
            error={errors?.name}
            className="sm:col-span-2"
          >
            <Input id="name" name="name" defaultValue={defaults.name} required />
          </Field>
          <Field
            label="SKU"
            htmlFor="sku"
            error={errors?.sku}
            hint="Your own reference, e.g. BKK-TEE-001."
          >
            <Input
              id="sku"
              name="sku"
              defaultValue={defaults.sku}
              className="font-mono"
              required
            />
          </Field>
          <Field label="Category" htmlFor="category" error={errors?.category}>
            <Input
              id="category"
              name="category"
              placeholder="Apparel"
              defaultValue={defaults.category ?? ''}
            />
          </Field>
          <Field label="Supplier" htmlFor="supplier" error={errors?.supplier}>
            <Input
              id="supplier"
              name="supplier"
              placeholder="Platinum Fashion Mall"
              defaultValue={defaults.supplier ?? ''}
            />
          </Field>
          <div />
          <Field
            label="Purchase price (MYR)"
            htmlFor="purchasePrice"
            error={errors?.purchasePrice}
            hint="What you pay in Bangkok."
          >
            <Input
              id="purchasePrice"
              name="purchasePrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults.purchasePrice}
              required
            />
          </Field>
          <Field
            label="Selling price (MYR)"
            htmlFor="sellingPrice"
            error={errors?.sellingPrice}
            hint="Default price on new orders."
          >
            <Input
              id="sellingPrice"
              name="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults.sellingPrice}
              required
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaults.active}
            className="size-4 rounded border-line"
          />
          Available to add to orders
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
