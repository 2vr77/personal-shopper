'use client'

import { useActionState, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'

import { createOrder } from '@/app/actions/orders'
import {
  Button,
  Card,
  Field,
  FormError,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { formatMYR, round2 } from '@/lib/money'
import type { ExtractedOrder } from '@/lib/ai-extraction'
import { AIExtractionForm } from './ai-extraction-form'

type ProductOption = {
  id: string
  name: string
  sku: string
  sellingPrice: number
  variants: Array<{ id: string; color: string | null; size: string | null }>
}

type CustomerOption = { id: string; name: string; whatsappNumber: string }

type Line = {
  key: string
  productId: string
  variantId: string
  qty: number
  sellingPrice: number
  notes: string
}

function newLine(): Line {
  return {
    key: crypto.randomUUID(),
    productId: '',
    variantId: '',
    qty: 1,
    sellingPrice: 0,
    notes: '',
  }
}

function variantLabel(v: { color: string | null; size: string | null }) {
  return [v.color, v.size].filter(Boolean).join(' · ') || 'Default'
}

export function OrderForm({
  customers,
  products,
}: {
  customers: CustomerOption[]
  products: ProductOption[]
}) {
  const [state, action, pending] = useActionState(createOrder, undefined)
  const [lines, setLines] = useState<Line[]>([newLine()])
  const [discount, setDiscount] = useState(0)
  const [cargoFee, setCargoFee] = useState(0)
  const [shippingFee, setShippingFee] = useState(0)

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  )

  function update(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )
  }

  /** Picking a product pre-fills its list price and clears any stale variant. */
  function chooseProduct(key: string, productId: string) {
    const product = productById.get(productId)
    update(key, {
      productId,
      variantId: '',
      sellingPrice: product?.sellingPrice ?? 0,
    })
  }

  function handleExtracted(extracted: ExtractedOrder) {
    const newLines: Line[] = []

    for (const item of extracted.items) {
      const product = products.find(
        (p) =>
          p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
          item.productName.toLowerCase().includes(p.name.toLowerCase())
      )

      if (product) {
        let variantId = ''
        if (item.color || item.size) {
          const variant = product.variants.find(
            (v) =>
              (!item.color || v.color?.toLowerCase() === item.color.toLowerCase()) &&
              (!item.size || v.size?.toLowerCase() === item.size.toLowerCase())
          )
          if (variant) {
            variantId = variant.id
          }
        }

        newLines.push({
          key: crypto.randomUUID(),
          productId: product.id,
          variantId,
          qty: item.quantity,
          sellingPrice: product.sellingPrice,
          notes: item.notes || '',
        })
      } else {
        newLines.push({
          key: crypto.randomUUID(),
          productId: '',
          variantId: '',
          qty: item.quantity,
          sellingPrice: 0,
          notes: `AI extracted: ${item.productName}${item.color ? ` (${item.color})` : ''}${item.size ? ` [${item.size}]` : ''}${item.notes ? ` — ${item.notes}` : ''}`,
        })
      }
    }

    if (newLines.length > 0) {
      setLines(newLines)
    }
  }

  const subtotal = round2(
    lines.reduce((sum, l) => sum + (l.sellingPrice || 0) * (l.qty || 0), 0)
  )
  const total = round2(subtotal - discount + cargoFee + shippingFee)

  // Only complete lines are submitted; a half-filled row is treated as not there.
  const payload = lines
    .filter((l) => l.productId)
    .map((l) => ({
      productId: l.productId,
      variantId: l.variantId || null,
      qty: l.qty,
      sellingPrice: l.sellingPrice,
      notes: l.notes || null,
    }))

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="items" value={JSON.stringify(payload)} />

      <FormError message={state?.message} />

      <AIExtractionForm onExtracted={handleExtracted} />

      <Card className="p-6">
        <Field
          label="Customer"
          htmlFor="customerId"
          error={state?.fieldErrors?.customerId}
        >
          <Select id="customerId" name="customerId" required defaultValue="">
            <option value="" disabled>
              Choose a customer…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.whatsappNumber}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-medium">Items</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLines((c) => [...c, newLine()])}
          >
            Add item
          </Button>
        </div>

        {state?.fieldErrors?.items && (
          <p className="px-4 pt-3 text-sm text-red-600">
            {state.fieldErrors.items.join(' ')}
          </p>
        )}

        <ul className="divide-y divide-line">
          {lines.map((line, index) => {
            const product = productById.get(line.productId)
            return (
              <li key={line.key} className="grid gap-3 p-4 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <Field label={`Product ${index + 1}`} htmlFor={`product-${line.key}`}>
                    <Select
                      id={`product-${line.key}`}
                      value={line.productId}
                      onChange={(e) => chooseProduct(line.key, e.target.value)}
                    >
                      <option value="">Choose a product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="sm:col-span-3">
                  <Field label="Variant" htmlFor={`variant-${line.key}`}>
                    <Select
                      id={`variant-${line.key}`}
                      value={line.variantId}
                      disabled={!product || product.variants.length === 0}
                      onChange={(e) => update(line.key, { variantId: e.target.value })}
                    >
                      <option value="">
                        {product && product.variants.length > 0 ? 'Any' : '—'}
                      </option>
                      {product?.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {variantLabel(v)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="sm:col-span-1">
                  <Field label="Qty" htmlFor={`qty-${line.key}`}>
                    <Input
                      id={`qty-${line.key}`}
                      type="number"
                      min="1"
                      step="1"
                      value={line.qty}
                      onChange={(e) =>
                        update(line.key, { qty: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Unit price" htmlFor={`price-${line.key}`}>
                    <Input
                      id={`price-${line.key}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.sellingPrice}
                      onChange={(e) =>
                        update(line.key, { sellingPrice: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>

                <div className="flex items-end justify-between gap-2 sm:col-span-1">
                  <span className="text-sm font-medium tabular-nums sm:hidden">
                    {formatMYR(line.sellingPrice * line.qty)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove item ${index + 1}`}
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((c) => c.filter((l) => l.key !== line.key))
                    }
                    className="mb-2 rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="sm:col-span-12">
                  <Input
                    placeholder="Note for this item (optional)"
                    value={line.notes}
                    onChange={(e) => update(line.key, { notes: e.target.value })}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Discount"
              htmlFor="discount"
              error={state?.fieldErrors?.discount}
            >
              <Input
                id="discount"
                name="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </Field>
            <Field label="Cargo fee" htmlFor="cargoFee">
              <Input
                id="cargoFee"
                name="cargoFee"
                type="number"
                min="0"
                step="0.01"
                value={cargoFee}
                onChange={(e) => setCargoFee(Number(e.target.value))}
              />
            </Field>
            <Field label="Shipping fee" htmlFor="shippingFee">
              <Input
                id="shippingFee"
                name="shippingFee"
                type="number"
                min="0"
                step="0.01"
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Order notes" htmlFor="notes">
              <Textarea id="notes" name="notes" />
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatMYR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Discount</dt>
              <dd className="tabular-nums">−{formatMYR(discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Cargo</dt>
              <dd className="tabular-nums">{formatMYR(cargoFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Shipping</dt>
              <dd className="tabular-nums">{formatMYR(shippingFee)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMYR(total)}</dd>
            </div>
          </dl>

          <Button
            type="submit"
            disabled={pending || payload.length === 0}
            className="mt-6 w-full"
          >
            {pending ? 'Creating…' : 'Create order'}
          </Button>
        </Card>
      </div>
    </form>
  )
}
