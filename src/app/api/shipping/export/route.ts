import { getCurrentUser, hasRole } from '@/lib/dal'
import { stringifyCsv } from '@/lib/csv'
import { ordersAwaitingShipment } from '@/lib/queries/shipping'

const HEADERS = [
  'Order Reference',
  'Receiver Name',
  'Receiver Phone',
  'Address Line 1',
  'Address Line 2',
  'City',
  'State',
  'Postcode',
  'Country',
  'Weight (kg)',
  'COD Amount',
  'Item Description',
  'Remarks',
]

/**
 * Bulk-booking template for J&T's upload portal. Column names are a sensible
 * default, not J&T's exact current schema — check against the live portal
 * template before a real bulk upload and adjust the header row here if it
 * has drifted.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user || !hasRole(user, 'STAFF')) return new Response('Unauthorized', { status: 401 })

  const orders = await ordersAwaitingShipment()
  const rows = [
    HEADERS,
    ...orders.map((o) => [
      o.orderNumber,
      o.customer.name,
      o.customer.whatsappNumber,
      o.customer.addressLine1 ?? '',
      o.customer.addressLine2 ?? '',
      o.customer.city ?? '',
      o.customer.state ?? '',
      o.customer.postcode ?? '',
      o.customer.country,
      o.weight !== null ? String(o.weight) : '',
      '0',
      `${o.itemCount} item${o.itemCount === 1 ? '' : 's'}`,
      o.notes ?? '',
    ]),
  ]

  return new Response(stringifyCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="jt-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
