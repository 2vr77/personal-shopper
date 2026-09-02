import { OrderStatus } from '@prisma/client'

/**
 * The order lifecycle, defined once. Pages read `ORDER_STATUS_FLOW` for display
 * order and `allowedTransitions` to decide which moves to offer — so the status
 * dropdown can never suggest something the business process disallows.
 */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PAYMENT_VERIFIED,
  OrderStatus.PURCHASING,
  OrderStatus.PURCHASED,
  OrderStatus.IN_CARGO,
  OrderStatus.ARRIVED_MY,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'New',
  AWAITING_PAYMENT: 'Awaiting payment',
  PAYMENT_VERIFIED: 'Payment verified',
  PURCHASING: 'Purchasing in Bangkok',
  PURCHASED: 'Purchased',
  IN_CARGO: 'In cargo',
  ARRIVED_MY: 'Arrived in Malaysia',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
}

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  NEW: 'bg-slate-100 text-slate-700 border-slate-200',
  AWAITING_PAYMENT: 'bg-amber-50 text-amber-800 border-amber-200',
  PAYMENT_VERIFIED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PURCHASING: 'bg-sky-50 text-sky-800 border-sky-200',
  PURCHASED: 'bg-sky-50 text-sky-800 border-sky-200',
  IN_CARGO: 'bg-violet-50 text-violet-800 border-violet-200',
  ARRIVED_MY: 'bg-violet-50 text-violet-800 border-violet-200',
  SHIPPED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  REFUNDED: 'bg-red-50 text-red-700 border-red-200',
}

/** Terminal states — an order here has left the pipeline. */
const TERMINAL: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED]

/**
 * Forward one step along the flow, plus the escape hatches. Staff can also step
 * backwards one stage to undo a mis-click, which happens often enough in
 * practice that forbidding it just leads to database edits.
 */
export function allowedTransitions(current: OrderStatus): OrderStatus[] {
  if (current === OrderStatus.CANCELLED || current === OrderStatus.REFUNDED) {
    return [OrderStatus.NEW]
  }

  const index = ORDER_STATUS_FLOW.indexOf(current)
  const next: OrderStatus[] = []

  if (index > 0) next.push(ORDER_STATUS_FLOW[index - 1])
  if (index >= 0 && index < ORDER_STATUS_FLOW.length - 1) {
    next.push(ORDER_STATUS_FLOW[index + 1])
  }

  if (current === OrderStatus.DELIVERED) next.push(OrderStatus.REFUNDED)
  else next.push(OrderStatus.CANCELLED)

  return next
}

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL.includes(status)
}

/** How far through the pipeline, for progress display. Terminal ⇒ complete. */
export function progressRatio(status: OrderStatus): number {
  if (isTerminal(status)) return 1
  const index = ORDER_STATUS_FLOW.indexOf(status)
  if (index < 0) return 0
  return index / (ORDER_STATUS_FLOW.length - 1)
}
