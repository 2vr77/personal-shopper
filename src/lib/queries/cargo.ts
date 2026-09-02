import 'server-only'

import { OrderStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { toNullableNumber, toNumber } from '@/lib/money'

export async function listCargoBatches() {
  const batches = await db.cargoBatch.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  })
  return batches.map((b) => ({
    ...b,
    totalCost: toNumber(b.totalCost),
    orderCount: b._count.orders,
  }))
}

export async function getCargoBatch(id: string) {
  const batch = await db.cargoBatch.findUnique({
    where: { id },
    include: {
      cargoOrders: {
        orderBy: { createdAt: 'asc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              customer: { select: { name: true } },
              _count: { select: { items: true } },
            },
          },
        },
      },
    },
  })
  if (!batch) return null

  return {
    ...batch,
    totalCost: toNumber(batch.totalCost),
    cargoOrders: batch.cargoOrders.map((co) => ({
      ...co,
      weight: toNullableNumber(co.weight),
      allocatedCost: toNumber(co.allocatedCost),
      order: { ...co.order, itemCount: co.order._count.items },
    })),
  }
}

/** Purchased orders that have not yet been assigned to a cargo shipment. */
export async function ordersAwaitingCargo() {
  const orders = await db.order.findMany({
    where: { status: OrderStatus.PURCHASED, cargoBatchId: null },
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
