'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { extractOrder } from '@/app/actions/orders'
import { Button, Card, Field, Textarea } from '@/components/ui'
import type { ExtractedOrder } from '@/lib/ai-extraction'

type Props = {
  onExtracted: (extracted: ExtractedOrder) => void
}

export function AIExtractionForm({ onExtracted }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExtract() {
    if (!text.trim()) {
      setError('Please enter text to extract')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await extractOrder(text)
      if (result.ok) {
        onExtracted(result.data)
        setText('')
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Extraction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-blue-900">AI-Assisted Order Extraction</h3>
      </div>
      <p className="mb-4 text-sm text-blue-800">
        Paste a customer message and let AI extract the order details automatically.
      </p>
      <Field label="Customer message" htmlFor="extract-text">
        <Textarea
          id="extract-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="e.g., Hi! I want 2 Nike Air Max in black size 9, and 1 Adidas hoodie red medium. Please deliver ASAP!"
        />
      </Field>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <Button
        type="button"
        onClick={handleExtract}
        disabled={loading || !text.trim()}
        className="mt-3"
      >
        {loading ? 'Extracting...' : 'Extract Order'}
      </Button>
    </Card>
  )
}
