import 'server-only'

import { OrderStatus } from '@prisma/client'

import { db } from '@/lib/db'
import { toNumber } from '@/lib/money'
import { isTerminal } from '@/lib/order-status'

/** Statuses that still need someone to do something. */
const ACTIVE_STATUSES = Object.values(OrderStatus).filter((s) => !isTerminal(s))

export async function getDashboard() {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    activeCount,
    awaitingPayment,
    deliveredThisMonth,
    revenueThisMonth,
    statusCounts,
    recentOrders,
    customerCount,
    productCount,
  ] = await Promise.all([
    db.order.count({ where: { status: { in: ACTIVE_STATUSES } } }),
    db.order.count({ where: { status: OrderStatus.AWAITING_PAYMENT } }),
    db.order.count({
      where: { status: OrderStatus.DELIVERED, deliveredAt: { gte: startOfMonth } },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: startOfMonth },
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] },
      },
    }),
    db.order.groupBy({ by: ['status'], _count: { _all: true } }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        customer: { select: { id: true, name: true } },
      },
    }),
    db.customer.count({ where: { active: true } }),
    db.product.count({ where: { active: true } }),
  ])

  const byStatus = new Map(statusCounts.map((s) => [s.status, s._count._all]))

  return {
    activeCount,
    awaitingPayment,
    deliveredThisMonth,
    revenueThisMonth: toNumber(revenueThisMonth._sum.total),
    customerCount,
    productCount,
    byStatus: Object.values(OrderStatus).map((status) => ({
      status,
      count: byStatus.get(status) ?? 0,
    })),
    recentOrders: recentOrders.map((o) => ({ ...o, total: toNumber(o.total) })),
  }
}
