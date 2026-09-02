import 'server-only'

import { randomUUID } from 'node:crypto'

import type { SendResult, WhatsAppProvider } from '../provider'

/**
 * The default provider until a BSP account exists. Never makes a network
 * call — it logs what would have been sent and returns success, so the rest
 * of the app (inbox, templates, automation) is fully exercisable before any
 * real credentials are available.
 */
export class DisconnectedProvider implements WhatsAppProvider {
  readonly name = 'disconnected'

  async sendText(to: string, body: string): Promise<SendResult> {
    console.log(`[whatsapp:disconnected] would send to ${to}:\n${body}`)
    return { waMessageId: `local-${randomUUID()}`, status: 'SENT' }
  }

  async sendTemplate(
    to: string,
    templateKey: string,
    variables: Record<string, string>
  ): Promise<SendResult> {
    console.log(
      `[whatsapp:disconnected] would send template "${templateKey}" to ${to}`,
      variables
    )
    return { waMessageId: `local-${randomUUID()}`, status: 'SENT' }
  }
}
