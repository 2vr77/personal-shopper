import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type ExtractedOrderItem = {
  productName: string
  quantity: number
  color?: string
  size?: string
  notes?: string
}

export type ExtractedOrder = {
  items: ExtractedOrderItem[]
  customerNotes?: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Extract structured order information from free-form text using Claude.
 * Returns null if extraction fails or API key is not configured.
 */
export async function extractOrderFromText(text: string): Promise<ExtractedOrder | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured, AI extraction disabled')
    return null
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an order extraction assistant for a personal shopping business. Extract structured order information from the following customer message.

Customer message:
${text}

Extract:
1. Product names and quantities
2. Variant details (color, size) if mentioned
3. Any special notes or requests
4. Your confidence level in the extraction (high/medium/low)

Respond ONLY with valid JSON matching this schema:
{
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "color": "string (optional)",
      "size": "string (optional)",
      "notes": "string (optional)"
    }
  ],
  "customerNotes": "string (optional)",
  "confidence": "high" | "medium" | "low"
}

If you cannot extract any items, return: {"items": [], "confidence": "low"}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return null
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return null
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractedOrder
    return extracted
  } catch (error) {
    console.error('AI extraction error:', error)
    return null
  }
}
