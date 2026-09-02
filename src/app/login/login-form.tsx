'use client'

import { useActionState } from 'react'

import { login } from '@/app/actions/auth'
import { Button, Card, Field, FormError, Input } from '@/components/ui'

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4">
        {next && <input type="hidden" name="next" value={next} />}
        <FormError message={state?.message} />

        <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </Card>
  )
}
