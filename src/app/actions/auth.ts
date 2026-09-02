'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

import { db } from '@/lib/db'
import { createSession, deleteSession } from '@/lib/session'
import { invalid, loginSchema, type ActionState } from '@/lib/validation'

/**
 * A hash to compare against when the email does not exist, so a missing account
 * and a wrong password take the same amount of time. Without this, response
 * timing tells an attacker which emails are registered.
 */
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.aWLu.5Y5tWNqQ0Y1SxJZBhZ0Zx3W'

export async function login(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return invalid(parsed.error)

  const { email, password } = parsed.data
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, role: true, passwordHash: true, active: true },
  })

  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

  // One message for every failure mode — never reveal which part was wrong.
  if (!user || !matches || !user.active) {
    return { ok: false, message: 'Incorrect email or password.' }
  }

  await createSession({ userId: user.id, role: user.role })

  const next = formData.get('next')
  // Only same-origin relative paths, otherwise `?next=https://evil.test` turns
  // the login form into an open redirect.
  const target =
    typeof next === 'string' && /^\/(?!\/)/.test(next) ? next : '/dashboard'
  redirect(target)
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
