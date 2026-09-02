import 'server-only'

import { OrderStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { toNullableNumber, toNumber } from '@/lib/money'

/** Arrived in Malaysia, not yet handed to a courier — the J&T export set. */
export async function ordersAwaitingShipment() {
  const orders = await db.order.findMany({
    where: { status: OrderStatus.ARRIVED_MY, shipments: { none: {} } },
    orderBy: { createdAt: 'asc' },
    include: {
      customer: true,
      cargoOrders: { select: { weight: true } },
      _count: { select: { items: true } },
    },
  })
  return orders.map((o) => ({
    ...o,
    itemCount: o._count.items,
    weight: o.cargoOrders[0] ? toNullableNumber(o.cargoOrders[0].weight) : null,
  }))
}

export async function listShipments() {
  const shipments = await db.shipment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          customer: { select: { name: true } },
        },
      },
    },
  })
  return shipments.map((s) => ({
    ...s,
    weight: toNullableNumber(s.weight),
    cost: toNumber(s.cost),
  }))
}
