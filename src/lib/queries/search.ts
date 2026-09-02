import 'server-only'

import { db } from '@/lib/db'
import { toNumber } from '@/lib/money'

/**
 * Global search across the three entities that have a human-facing identifier.
 * Deliberately a simple `contains` scan — at this data volume it stays instant,
 * and it avoids committing to a full-text setup before the shape of real
 * queries is known.
 */
export async function globalSearch(query: string) {
  const q = query.trim()
  if (!q) return { orders: [], customers: [], products: [], total: 0 }

  const [orders, customers, products] = await Promise.all([
    db.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customer: { name: { contains: q, mode: 'insensitive' } } },
          { customer: { whatsappNumber: { contains: q, mode: 'insensitive' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.customer.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { whatsappNumber: { contains: q, mode: 'insensitive' } },
          { instagram: { contains: q, mode: 'insensitive' } },
          { tiktok: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, name: true, whatsappNumber: true, city: true },
    }),
    db.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: { id: true, name: true, sku: true, sellingPrice: true },
    }),
  ])

  return {
    orders: orders.map((o) => ({ ...o, total: toNumber(o.total) })),
    customers,
    products: products.map((p) => ({ ...p, sellingPrice: toNumber(p.sellingPrice) })),
    total: orders.length + customers.length + products.length,
  }
}
