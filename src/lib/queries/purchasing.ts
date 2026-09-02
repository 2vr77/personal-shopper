import 'server-only'

import { OrderStatus, PurchaseItemStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { toNullableNumber, toNumber } from '@/lib/money'

export async function listPurchaseBatches() {
  const batches = await db.purchaseBatch.findMany({
    orderBy: { tripDate: 'desc' },
    include: { _count: { select: { items: true, orders: true } } },
  })
  return batches.map((b) => ({
    ...b,
    itemCount: b._count.items,
    orderCount: b._count.orders,
  }))
}

export async function getPurchaseBatch(id: string) {
  const batch = await db.purchaseBatch.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          orderItem: {
            include: {
              order: { select: { id: true, orderNumber: true, status: true } },
              product: { select: { id: true, name: true, sku: true, supplier: true } },
              variant: { select: { color: true, size: true } },
            },
          },
          purchasedBy: { select: { name: true } },
        },
      },
    },
  })
  if (!batch) return null

  const items = batch.items.map((i) => ({
    ...i,
    actualCost: toNullableNumber(i.actualCost),
    orderItem: {
      ...i.orderItem,
      sellingPrice: toNumber(i.orderItem.sellingPrice),
      purchaseCost: toNumber(i.orderItem.purchaseCost),
    },
  }))

  // Aggregated by product+variant, so the shopper has a single "go buy this
  // many" list rather than having to read every order line individually.
  const shoppingList = new Map<
    string,
    { productName: string; sku: string; variant: string; supplier: string | null; qty: number }
  >()
  for (const item of items) {
    if (item.status !== PurchaseItemStatus.PENDING) continue
    const variant =
      [item.orderItem.variant?.color, item.orderItem.variant?.size].filter(Boolean).join(' · ') ||
      'Default'
    const key = `${item.orderItem.product.id}:${variant}`
    const existing = shoppingList.get(key)
    if (existing) existing.qty += item.orderItem.qty
    else {
      shoppingList.set(key, {
        productName: item.orderItem.product.name,
        sku: item.orderItem.product.sku,
        variant,
        supplier: item.orderItem.product.supplier,
        qty: item.orderItem.qty,
      })
    }
  }

  return { ...batch, items, shoppingList: [...shoppingList.values()] }
}

/** Paid orders that have not yet been assigned to a shopping trip. */
export async function ordersAwaitingPurchase() {
  const orders = await db.order.findMany({
    where: { status: OrderStatus.PAYMENT_VERIFIED, purchaseBatchId: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orderNumber: true,
      customer: { select: { name: true } },
      _count: { select: { items: true } },
    },
  })
  return orders.map((o) => ({ ...o, itemCount: o._count.items }))
}
