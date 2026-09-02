import type { Prisma } from '@prisma/client'

/**
 * Prisma returns `Decimal` instances for money columns. Those are class
 * instances, so React refuses to pass them across the Server/Client Component
 * boundary. Every query helper runs its rows through these converters, which
 * means components only ever see plain numbers.
 */
export type Decimalish = Prisma.Decimal | number | string | null | undefined

export function toNumber(value: Decimalish): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return value.toNumber()
}

export function toNullableNumber(value: Decimalish): number | null {
  if (value === null || value === undefined) return null
  return toNumber(value)
}

const myr = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 2,
})

export function formatMYR(value: Decimalish): string {
  return myr.format(toNumber(value))
}

/** Rounds to sen, avoiding float drift like 0.1 + 0.2 creeping into totals. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
