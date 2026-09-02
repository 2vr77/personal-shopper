'use client'

import { useActionState } from 'react'

import { addVariant } from '@/app/actions/products'
import { Button, Field, FormError, Input } from '@/components/ui'

export function VariantForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(addVariant, undefined)

  return (
    <form action={action} className="flex flex-col gap-4 border-t border-line p-4">
      <input type="hidden" name="productId" value={productId} />
      <FormError message={state?.ok ? undefined : state?.message} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Colour" htmlFor="color">
          <Input id="color" name="color" placeholder="Black" />
        </Field>
        <Field label="Size" htmlFor="size">
          <Input id="size" name="size" placeholder="M" />
        </Field>
        <Field label="SKU suffix" htmlFor="skuSuffix">
          <Input id="skuSuffix" name="skuSuffix" placeholder="-BLK-M" className="font-mono" />
        </Field>
      </div>

      <Field label="Stock note" htmlFor="stockNote">
        <Input id="stockNote" name="stockNote" placeholder="Usually in stock at stall 4B" />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Adding…' : 'Add variant'}
        </Button>
      </div>
    </form>
  )
}
