'use client'

import { useActionState } from 'react'

import { sendInboxMessage } from '@/app/actions/whatsapp'
import { Button, FormError, Textarea } from '@/components/ui'

export function ComposeForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendInboxMessage, undefined)

  return (
    <form action={action} className="flex flex-col gap-2 border-t border-line p-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      <FormError message={state?.ok ? undefined : state?.message} />
      <Textarea name="body" placeholder="Type a message…" required />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </form>
  )
}
