import 'server-only'

import { db } from '@/lib/db'
import { formatMYR } from '@/lib/money'
import { ORDER_STATUS_LABEL } from '@/lib/order-status'

import { sendTemplateMessage } from './service'

export type AutomationSettings = {
  whatsappEnabled: boolean
  notifyOnStatusChange: boolean
}

const DEFAULTS: AutomationSettings = { whatsappEnabled: false, notifyOnStatusChange: false }

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const row = await db.setting.findUnique({ where: { key: 'automation' } })
  const value = row?.value as Partial<AutomationSettings> | undefined
  return {
    whatsappEnabled: value?.whatsappEnabled ?? DEFAULTS.whatsappEnabled,
    notifyOnStatusChange: value?.notifyOnStatusChange ?? DEFAULTS.notifyOnStatusChange,
  }
}

/**
 * Fires a WhatsApp template message when an order's status changes, keyed by
 * convention as `status_<STATUS>` (e.g. `status_PAYMENT_VERIFIED`). Called
 * from every place an order status changes — see the call sites in
 * app/actions/{orders,purchasing,cargo,shipping}.ts.
 *
 * Never throws: a notification failure must not roll back or fail the order
 * update that triggered it, so every error is caught and logged here.
 */
export async function notifyOrderStatusChange(orderId: string, status: string): Promise<void> {
  try {
    const settings = await getAutomationSettings()
    if (!settings.whatsappEnabled || !settings.notifyOnStatusChange) return

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        total: true,
        customer: { select: { name: true, whatsappNumber: true } },
      },
    })
    if (!order) return

    // Template keys are constrained to lowercase (see messageTemplateSchema),
    // so the convention is status_<status in lowercase>, e.g. status_shipped.
    await sendTemplateMessage(order.customer.whatsappNumber, `status_${status.toLowerCase()}`, {
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      status: ORDER_STATUS_LABEL[status as keyof typeof ORDER_STATUS_LABEL] ?? status,
      total: formatMYR(order.total),
    })
  } catch (error) {
    console.error(`WhatsApp automation failed for order ${orderId} (${status}):`, error)
  }
}
