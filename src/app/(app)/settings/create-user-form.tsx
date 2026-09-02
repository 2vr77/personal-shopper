'use client'

import { useActionState } from 'react'
import { createUser } from '@/app/actions/auth'
import { Button } from '@/components/ui'

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded border border-line px-3 py-2 text-sm"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-line px-3 py-2 text-sm"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded border border-line px-3 py-2 text-sm"
          placeholder="Min 8 characters"
        />
      </div>

      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          name="role"
          required
          className="w-full rounded border border-line px-3 py-2 text-sm"
        >
          <option value="STAFF">Staff</option>
          <option value="SHOPPER">Shopper</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {state && (
        <div
          className={`rounded p-3 text-sm ${
            state.ok
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {state.message}
        </div>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}
