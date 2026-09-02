import 'server-only'

import type { OrderStatus, Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import { toNullableNumber, toNumber } from '@/lib/money'

export const ORDER_PAGE_SIZE = 20

export type OrderListRow = Awaited<ReturnType<typeof listOrders>>['rows'][number]
export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>

export async function listOrders(options: {
  status?: OrderStatus
  customerId?: string
  query?: string
  page?: number
}) {
  const page = Math.max(1, options.page ?? 1)

  const where: Prisma.OrderWhereInput = {
    ...(options.status ? { status: options.status } : {}),
    ...(options.customerId ? { customerId: options.customerId } : {}),
    ...(options.query
      ? {
          OR: [
            { orderNumber: { contains: options.query, mode: 'insensitive' } },
            { customer: { name: { contains: options.query, mode: 'insensitive' } } },
            {
              customer: {
                whatsappNumber: { contains: options.query, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  }

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ORDER_PAGE_SIZE,
      take: ORDER_PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        customer: { select: { id: true, name: true, whatsappNumber: true } },
        _count: { select: { items: true } },
      },
    }),
  ])

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE)),
    rows: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: toNumber(o.total),
      createdAt: o.createdAt,
      customer: o.customer,
      itemCount: o._count.items,
    })),
  }
}

export async function getOrder(id: string) {
  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
      purchaseBatch: { select: { id: true, label: true } },
      cargoBatch: { select: { id: true, label: true, status: true } },
      cargoOrders: { select: { weight: true, allocatedCost: true } },
      shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, color: true, size: true } },
          purchaseItems: { select: { status: true, actualCost: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        include: { changedBy: { select: { id: true, name: true } } },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        include: {
          receipts: { orderBy: { uploadedAt: 'desc' } },
          verifiedBy: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!order) return null

  const cargoOrder = order.cargoOrders[0]
  const shipment = order.shipments[0]

  return {
    ...order,
    subtotal: toNumber(order.subtotal),
    discount: toNumber(order.discount),
    cargoFee: toNumber(order.cargoFee),
    shippingFee: toNumber(order.shippingFee),
    total: toNumber(order.total),
    cargoWeight: cargoOrder ? toNullableNumber(cargoOrder.weight) : null,
    cargoAllocatedCost: cargoOrder ? toNumber(cargoOrder.allocatedCost) : null,
    shipment: shipment
      ? { ...shipment, weight: toNullableNumber(shipment.weight), cost: toNumber(shipment.cost) }
      : null,
    items: order.items.map((item) => ({
      ...item,
      sellingPrice: toNumber(item.sellingPrice),
      purchaseCost: toNumber(item.purchaseCost),
      // An order item has at most one purchase item (an order is only ever on
      // one shopping trip at a time), so this is the real price paid, if known.
      actualPurchaseCost: item.purchaseItems[0]
        ? toNullableNumber(item.purchaseItems[0].actualCost)
        : null,
      lineTotal: toNumber(item.sellingPrice) * item.qty,
    })),
    payments: order.payments.map((p) => ({
      ...p,
      amount: toNumber(p.amount),
    })),
  }
}

/**
 * Estimated margin: revenue actually charged, less what the goods cost. Uses
 * the real price paid on the shopping trip once it's known (`actualPurchaseCost`),
 * falling back to the catalogue price for items not yet purchased. Cargo and
 * shipping fees are pass-through and excluded from goods cost.
 */
export function estimateMargin(order: {
  subtotal: number
  discount: number
  items: Array<{ purchaseCost: number; actualPurchaseCost: number | null; qty: number }>
}) {
  const revenue = order.subtotal - order.discount
  const cost = order.items.reduce(
    (sum, i) => sum + (i.actualPurchaseCost ?? i.purchaseCost) * i.qty,
    0
  )
  const isActual = order.items.length > 0 && order.items.every((i) => i.actualPurchaseCost !== null)
  return { revenue, cost, profit: revenue - cost, isActual }
}
