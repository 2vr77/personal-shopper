import 'server-only'

import { OrderStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { toNumber } from '@/lib/money'

export type ProfitReport = Awaited<ReturnType<typeof getProfitReport>>
export type OrderStatusBreakdown = Awaited<ReturnType<typeof getOrderStatusBreakdown>>
export type TimeSeriesData = Awaited<ReturnType<typeof getTimeSeriesData>>
export type CategoryPerformance = Awaited<ReturnType<typeof getCategoryPerformance>>

/**
 * Revenue/cost/profit for orders created in a date range. Uses the real price
 * paid on the shopping trip once an item has been purchased (same rule as the
 * order detail page's margin card), falling back to catalogue cost otherwise.
 */
export async function getProfitReport(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
    },
    select: {
      id: true,
      subtotal: true,
      discount: true,
      cargoFee: true,
      shippingFee: true,
      customer: { select: { id: true, name: true } },
      items: {
        select: {
          qty: true,
          sellingPrice: true,
          purchaseCost: true,
          product: { select: { id: true, name: true } },
          purchaseItems: { select: { actualCost: true } },
        },
      },
    },
  })

  let revenue = 0
  let goodsCost = 0
  let cargoShipping = 0
  let discount = 0

  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>()
  const byCustomer = new Map<string, { name: string; orders: number; revenue: number }>()

  for (const order of orders) {
    const orderRevenue = toNumber(order.subtotal) - toNumber(order.discount)
    revenue += orderRevenue
    discount += toNumber(order.discount)
    cargoShipping += toNumber(order.cargoFee) + toNumber(order.shippingFee)

    for (const item of order.items) {
      const actual = item.purchaseItems[0] ? toNumber(item.purchaseItems[0].actualCost) : null
      goodsCost += (actual ?? toNumber(item.purchaseCost)) * item.qty

      const lineRevenue = toNumber(item.sellingPrice) * item.qty
      const p = byProduct.get(item.product.id) ?? { name: item.product.name, qty: 0, revenue: 0 }
      p.qty += item.qty
      p.revenue += lineRevenue
      byProduct.set(item.product.id, p)
    }

    const c = byCustomer.get(order.customer.id) ?? {
      name: order.customer.name,
      orders: 0,
      revenue: 0,
    }
    c.orders += 1
    c.revenue += orderRevenue
    byCustomer.set(order.customer.id, c)
  }

  return {
    orderCount: orders.length,
    revenue,
    goodsCost,
    cargoShipping,
    discount,
    netProfit: revenue - goodsCost - cargoShipping,
    topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    topCustomers: [...byCustomer.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  }
}

/**
 * Count of orders by status in the date range.
 */
export async function getOrderStatusBreakdown(from: Date, to: Date) {
  const results = await db.order.groupBy({
    by: ['status'],
    where: { createdAt: { gte: from, lte: to } },
    _count: { id: true },
  })

  return results.map((r) => ({
    status: r.status,
    count: r._count.id,
  }))
}

/**
 * Daily aggregated revenue and order count for charting.
 */
export async function getTimeSeriesData(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
    },
    select: {
      createdAt: true,
      subtotal: true,
      discount: true,
    },
  })

  const byDate = new Map<string, { date: string; revenue: number; orderCount: number }>()

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10)
    const revenue = toNumber(order.subtotal) - toNumber(order.discount)

    const existing = byDate.get(dateKey) ?? { date: dateKey, revenue: 0, orderCount: 0 }
    existing.revenue += revenue
    existing.orderCount += 1
    byDate.set(dateKey, existing)
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Performance metrics by product category.
 */
export async function getCategoryPerformance(from: Date, to: Date) {
  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
    },
    select: {
      items: {
        select: {
          qty: true,
          sellingPrice: true,
          purchaseCost: true,
          product: { select: { category: true } },
          purchaseItems: { select: { actualCost: true } },
        },
      },
    },
  })

  const byCategory = new Map<
    string,
    { category: string; revenue: number; cost: number; qty: number }
  >()

  for (const order of orders) {
    for (const item of order.items) {
      const category = item.product.category || 'Uncategorized'
      const revenue = toNumber(item.sellingPrice) * item.qty
      const actual = item.purchaseItems[0] ? toNumber(item.purchaseItems[0].actualCost) : null
      const cost = (actual ?? toNumber(item.purchaseCost)) * item.qty

      const c = byCategory.get(category) ?? { category, revenue: 0, cost: 0, qty: 0 }
      c.revenue += revenue
      c.cost += cost
      c.qty += item.qty
      byCategory.set(category, c)
    }
  }

  return [...byCategory.values()]
    .map((c) => ({ ...c, margin: c.revenue - c.cost }))
    .sort((a, b) => b.revenue - a.revenue)
}
