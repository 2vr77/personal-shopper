import 'server-only'

import type { Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import { toNumber } from '@/lib/money'

// --- Customers -------------------------------------------------------------

export async function listCustomers(query?: string) {
  const where: Prisma.CustomerWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { whatsappNumber: { contains: query, mode: 'insensitive' } },
          { instagram: { contains: query, mode: 'insensitive' } },
          { tiktok: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {}

  const customers = await db.customer.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      instagram: true,
      tiktok: true,
      city: true,
      active: true,
      _count: { select: { orders: true } },
    },
  })

  return customers.map((c) => ({ ...c, orderCount: c._count.orders }))
}

export async function getCustomer(id: string) {
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  })
  if (!customer) return null

  const orders = customer.orders.map((o) => ({ ...o, total: toNumber(o.total) }))
  return {
    ...customer,
    orders,
    lifetimeValue: orders.reduce((sum, o) => sum + o.total, 0),
  }
}

/** Minimal list for the order form's customer picker. */
export async function customerOptions() {
  return db.customer.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, whatsappNumber: true },
  })
}

// --- Products --------------------------------------------------------------

export async function listProducts(query?: string) {
  const where: Prisma.ProductWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { supplier: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {}

  const products = await db.product.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      supplier: true,
      purchasePrice: true,
      sellingPrice: true,
      active: true,
      _count: { select: { variants: true } },
    },
  })

  return products.map((p) => ({
    ...p,
    purchasePrice: toNumber(p.purchasePrice),
    sellingPrice: toNumber(p.sellingPrice),
    margin: toNumber(p.sellingPrice) - toNumber(p.purchasePrice),
    variantCount: p._count.variants,
  }))
}

export async function getProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
      _count: { select: { orderItems: true } },
    },
  })
  if (!product) return null

  return {
    ...product,
    purchasePrice: toNumber(product.purchasePrice),
    sellingPrice: toNumber(product.sellingPrice),
    timesOrdered: product._count.orderItems,
  }
}

/** Products plus variants, for the order form's line-item picker. */
export async function productOptions() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      sku: true,
      sellingPrice: true,
      purchasePrice: true,
      variants: {
        where: { active: true },
        orderBy: [{ color: 'asc' }, { size: 'asc' }],
        select: { id: true, color: true, size: true },
      },
    },
  })

  return products.map((p) => ({
    ...p,
    sellingPrice: toNumber(p.sellingPrice),
    purchasePrice: toNumber(p.purchasePrice),
  }))
}
