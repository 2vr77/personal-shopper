export type SendResult = {
  waMessageId: string
  status: 'SENT' | 'FAILED'
  error?: string
}

/**
 * Every BSP (360dialog, Wati, Twilio, ...) sits between us and the same Meta
 * Cloud API shape, so one interface covers all of them. Add a new file under
 * `providers/` implementing this, then switch `WHATSAPP_PROVIDER` in
 * `index.ts` — nothing else in the app changes.
 */
export interface WhatsAppProvider {
  readonly name: string
  sendText(to: string, body: string): Promise<SendResult>
  sendTemplate(
    to: string,
    templateKey: string,
    variables: Record<string, string>
  ): Promise<SendResult>
}
