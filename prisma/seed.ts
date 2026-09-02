/**
 * Demo data for local development.
 *
 * Idempotent: every write is an upsert keyed on a natural unique column, so
 * running `npm run db:seed` repeatedly converges rather than duplicating. Orders
 * are the exception — they key off a deterministic customer+status pair and are
 * skipped when already present, because order numbers come from a sequence.
 */
import { PrismaClient, OrderStatus, Prisma, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

type ProductWithVariants = Prisma.ProductGetPayload<{ include: { variants: true } }>

const db = new PrismaClient()

const DEMO_PASSWORD = 'password123'

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  // --- Users -------------------------------------------------------------
  const users = await Promise.all(
    (
      [
        { name: 'Rayan', email: 'admin@personalshopper.test', role: Role.ADMIN },
        { name: 'Aina Staff', email: 'staff@personalshopper.test', role: Role.STAFF },
        { name: 'Bangkok Shopper', email: 'shopper@personalshopper.test', role: Role.SHOPPER },
      ] as const
    ).map((u) =>
      db.user.upsert({
        where: { email: u.email },
        update: { name: u.name, role: u.role },
        create: { ...u, passwordHash },
      })
    )
  )
  const admin = users[0]

  // --- Customers ---------------------------------------------------------
  const customerSeed = [
    {
      name: 'Nurul Hakim',
      whatsappNumber: '+60123456789',
      instagram: '@nurulhakim',
      addressLine1: '12 Jalan Bukit Bintang',
      city: 'Kuala Lumpur',
      state: 'Wilayah Persekutuan',
      postcode: '55100',
    },
    {
      name: 'Siti Aminah',
      whatsappNumber: '+60198887766',
      tiktok: '@sitishops',
      addressLine1: '88 Lorong Kenanga',
      city: 'Shah Alam',
      state: 'Selangor',
      postcode: '40000',
    },
    {
      name: 'Wei Ling Tan',
      whatsappNumber: '+60167778899',
      instagram: '@weilingt',
      addressLine1: '5 Persiaran Gurney',
      city: 'George Town',
      state: 'Pulau Pinang',
      postcode: '10250',
    },
  ]

  const customers = await Promise.all(
    customerSeed.map((c) =>
      db.customer.upsert({
        where: { whatsappNumber: c.whatsappNumber },
        update: c,
        create: c,
      })
    )
  )

  // --- Products & variants ------------------------------------------------
  const productSeed = [
    {
      sku: 'BKK-TEE-001',
      name: 'Oversized Cotton Tee',
      category: 'Apparel',
      supplier: 'Platinum Fashion Mall',
      purchasePrice: 18,
      sellingPrice: 45,
      variants: [
        { color: 'Black', size: 'M' },
        { color: 'Black', size: 'L' },
        { color: 'Cream', size: 'M' },
      ],
    },
    {
      sku: 'BKK-BAG-002',
      name: 'Woven Tote Bag',
      category: 'Bags',
      supplier: 'Chatuchak Market',
      purchasePrice: 32,
      sellingPrice: 79,
      variants: [
        { color: 'Natural', size: 'One Size' },
        { color: 'Brown', size: 'One Size' },
      ],
    },
    {
      sku: 'BKK-SKN-003',
      name: 'Herbal Facial Serum 30ml',
      category: 'Skincare',
      supplier: 'Boots Thailand',
      purchasePrice: 24,
      sellingPrice: 58,
      variants: [],
    },
    {
      sku: 'BKK-SHO-004',
      name: 'Chunky Platform Sandals',
      category: 'Footwear',
      supplier: 'Pratunam',
      purchasePrice: 41,
      sellingPrice: 99,
      variants: [
        { color: 'White', size: '38' },
        { color: 'White', size: '39' },
        { color: 'Black', size: '38' },
      ],
    },
  ]

  const products: ProductWithVariants[] = []
  for (const { variants, ...p } of productSeed) {
    const product = await db.product.upsert({
      where: { sku: p.sku },
      update: p,
      create: p,
    })
    for (const v of variants) {
      await db.productVariant.upsert({
        where: {
          productId_color_size: {
            productId: product.id,
            color: v.color,
            size: v.size,
          },
        },
        update: {},
        create: { ...v, productId: product.id },
      })
    }
    products.push(
      await db.product.findUniqueOrThrow({
        where: { id: product.id },
        include: { variants: true },
      })
    )
  }

  // --- Orders -------------------------------------------------------------
  // One order per lifecycle stage, so the dashboard and filters have something
  // meaningful to show on a fresh database.
  const orderPlan: Array<{
    customerIndex: number
    status: OrderStatus
    lines: Array<{ productIndex: number; variantIndex?: number; qty: number }>
    discount?: number
    cargoFee?: number
    shippingFee?: number
  }> = [
    {
      customerIndex: 0,
      status: OrderStatus.NEW,
      lines: [{ productIndex: 0, variantIndex: 0, qty: 2 }],
    },
    {
      customerIndex: 1,
      status: OrderStatus.AWAITING_PAYMENT,
      lines: [
        { productIndex: 1, variantIndex: 0, qty: 1 },
        { productIndex: 2, qty: 2 },
      ],
      shippingFee: 8,
    },
    {
      customerIndex: 2,
      status: OrderStatus.PAYMENT_VERIFIED,
      lines: [{ productIndex: 3, variantIndex: 1, qty: 1 }],
      discount: 10,
      shippingFee: 10,
    },
    {
      customerIndex: 0,
      status: OrderStatus.IN_CARGO,
      lines: [
        { productIndex: 0, variantIndex: 2, qty: 3 },
        { productIndex: 1, variantIndex: 1, qty: 1 },
      ],
      cargoFee: 15,
      shippingFee: 9,
    },
    {
      customerIndex: 1,
      status: OrderStatus.DELIVERED,
      lines: [{ productIndex: 2, qty: 1 }],
      cargoFee: 6,
      shippingFee: 8,
    },
  ]

  const existingOrders = await db.order.count()
  if (existingOrders > 0) {
    console.log(`• ${existingOrders} order(s) already present — skipping order seed`)
  } else {
    for (const plan of orderPlan) {
      const items = plan.lines.map((line) => {
        const product = products[line.productIndex]
        const variant =
          line.variantIndex !== undefined ? product.variants[line.variantIndex] : null
        return {
          productId: product.id,
          variantId: variant?.id ?? null,
          qty: line.qty,
          sellingPrice: product.sellingPrice,
          purchaseCost: product.purchasePrice,
        }
      })

      const subtotal = items.reduce(
        (sum, i) => sum + Number(i.sellingPrice) * i.qty,
        0
      )
      const discount = plan.discount ?? 0
      const cargoFee = plan.cargoFee ?? 0
      const shippingFee = plan.shippingFee ?? 0
      const total = subtotal - discount + cargoFee + shippingFee

      await db.order.create({
        data: {
          customerId: customers[plan.customerIndex].id,
          createdById: admin.id,
          status: plan.status,
          subtotal,
          discount,
          cargoFee,
          shippingFee,
          total,
          deliveredAt: plan.status === OrderStatus.DELIVERED ? new Date() : null,
          items: { create: items },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: plan.status,
              changedById: admin.id,
              note: 'Seeded demo order',
            },
          },
        },
      })
    }
    console.log(`• Created ${orderPlan.length} demo orders`)
  }

  // --- Settings -----------------------------------------------------------
  await db.setting.upsert({
    where: { key: 'automation' },
    update: {},
    create: {
      key: 'automation',
      // Phase 4 reads these; every automation ships switched off.
      value: { whatsappEnabled: false, notifyOnStatusChange: false },
    },
  })

  // --- WhatsApp message templates ------------------------------------------
  // Keyed status_<STATUS> by convention — see lib/whatsapp/automation.ts.
  const templateSeed = [
    {
      key: 'status_payment_verified',
      name: 'Payment verified',
      body: 'Hi {{customerName}}! We’ve verified your payment for order {{orderNumber}} ({{total}}). We’ll head to Bangkok to shop for it soon 🛍️',
    },
    {
      key: 'status_in_cargo',
      name: 'In cargo',
      body: 'Your order {{orderNumber}} is packed and on its way from Bangkok to Malaysia by cargo 📦',
    },
    {
      key: 'status_arrived_my',
      name: 'Arrived in Malaysia',
      body: 'Good news — order {{orderNumber}} has arrived in Malaysia! It’ll be booked for local delivery shortly.',
    },
    {
      key: 'status_shipped',
      name: 'Shipped',
      body: 'Order {{orderNumber}} is out for delivery via J&T. We’ll let you know once it’s delivered!',
    },
    {
      key: 'status_delivered',
      name: 'Delivered',
      body: 'Order {{orderNumber}} has been delivered. Thank you for shopping with us, {{customerName}}! 🎉',
    },
  ] as const

  for (const t of templateSeed) {
    await db.messageTemplate.upsert({
      where: { key: t.key },
      update: {},
      create: { ...t, variables: ['customerName', 'orderNumber', 'total'] },
    })
  }

  console.log(
    `\nSeed complete.\n  Users:     ${users.length}\n  Customers: ${customers.length}\n  Products:  ${products.length}\n\n  Sign in with any of:\n    admin@personalshopper.test    (ADMIN)\n    staff@personalshopper.test    (STAFF)\n    shopper@personalshopper.test  (SHOPPER)\n  Password for all: ${DEMO_PASSWORD}\n`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
