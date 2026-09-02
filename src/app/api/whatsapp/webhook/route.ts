import type { NextRequest } from 'next/server'

import { recordInboundMessage } from '@/lib/whatsapp/service'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Meta's webhook handshake: it calls this once with a token to prove we own
 * the endpoint before it will start sending real events. A BSP proxies the
 * same handshake. See WHATSAPP_WEBHOOK_VERIFY_TOKEN in .env.example.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && challenge && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

/**
 * Accepts the Meta Cloud API webhook shape (entry[].changes[].value.messages[]),
 * which every BSP forwards as-is or close to it. Parsing is deliberately
 * tolerant — unrecognised shapes are skipped, not rejected, since a malformed
 * or partial payload should never turn into a 4xx that makes the provider
 * retry forever.
 *
 * No signature verification yet: that needs a real app secret from a BSP,
 * which doesn't exist until one is onboarded. Add X-Hub-Signature-256 HMAC
 * verification here before pointing a live webhook at this endpoint.
 */
export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const entries = isRecord(payload) ? asArray(payload.entry) : []
  for (const entry of entries) {
    if (!isRecord(entry)) continue
    for (const change of asArray(entry.changes)) {
      if (!isRecord(change) || !isRecord(change.value)) continue
      for (const message of asArray(change.value.messages)) {
        if (!isRecord(message) || typeof message.from !== 'string') continue

        const text = isRecord(message.text) ? message.text.body : undefined
        await recordInboundMessage({
          phoneNumber: message.from,
          body: typeof text === 'string' ? text : '',
          waMessageId: typeof message.id === 'string' ? message.id : undefined,
        })
      }
    }
  }

  // Always 200 quickly — providers treat non-2xx as failed delivery and retry
  // aggressively, which would just replay the same events.
  return new Response('OK', { status: 200 })
}
