import type { OrderStatus } from '@prisma/client'

import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/order-status'
import { cn } from '@/lib/utils'

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        ORDER_STATUS_TONE[status],
        className
      )}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border border-line bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700',
        className
      )}
    >
      {children}
    </span>
  )
}
