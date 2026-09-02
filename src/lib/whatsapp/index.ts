import 'server-only'

import type { WhatsAppProvider } from './provider'
import { DisconnectedProvider } from './providers/disconnected'

function createProvider(): WhatsAppProvider {
  // No BSP is configured yet. Once you onboard one (360dialog, Wati, Twilio,
  // ...), add a `providers/<name>.ts` implementing WhatsAppProvider and a case
  // here selected by WHATSAPP_PROVIDER — every caller in the app goes through
  // this one export, so nothing else needs to change.
  switch (process.env.WHATSAPP_PROVIDER) {
    default:
      return new DisconnectedProvider()
  }
}

export const whatsappProvider: WhatsAppProvider = createProvider()
export const isWhatsAppConnected = whatsappProvider.name !== 'disconnected'
