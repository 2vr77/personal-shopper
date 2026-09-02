import type { AllocationMethod } from '@prisma/client'

import { round2 } from '@/lib/money'

export type AllocationInput = {
  orderId: string
  weight: number | null
  itemCount: number
}

/**
 * Splits a cargo batch's total cost across its orders. Falls back to an equal
 * split when the chosen basis is all zero — e.g. WEIGHT is selected but no
 * weights have been entered yet — so the page never shows RM0.00 everywhere
 * before shipping data is in.
 */
export function computeAllocation(
  orders: AllocationInput[],
  totalCost: number,
  method: AllocationMethod,
  manual?: Record<string, number>
): Record<string, number> {
  if (orders.length === 0) return {}

  if (method === 'MANUAL') {
    return Object.fromEntries(orders.map((o) => [o.orderId, round2(manual?.[o.orderId] ?? 0)]))
  }

  const basis = (o: AllocationInput) => {
    if (method === 'WEIGHT') return o.weight ?? 0
    if (method === 'ITEM_COUNT') return o.itemCount
    return 1 // EQUAL
  }

  let weights = orders.map(basis)
  let totalWeight = weights.reduce((a, b) => a + b, 0)
  if (totalWeight <= 0) {
    weights = orders.map(() => 1)
    totalWeight = orders.length
  }

  const rounded = weights.map((w) => round2((totalCost * w) / totalWeight))

  // Rounding to cents can leave the sum a cent or two off; push the remainder
  // onto the largest share rather than leaving it unaccounted for.
  const drift = round2(totalCost - rounded.reduce((a, b) => a + b, 0))
  if (drift !== 0) {
    const maxIndex = rounded.indexOf(Math.max(...rounded))
    rounded[maxIndex] = round2(rounded[maxIndex] + drift)
  }

  return Object.fromEntries(orders.map((o, i) => [o.orderId, rounded[i]]))
}
