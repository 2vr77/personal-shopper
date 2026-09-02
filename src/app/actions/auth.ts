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

export async function createUser(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const name = formData.get('name')
  const email = formData.get('email')
  const password = formData.get('password')
  const role = formData.get('role')

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof role !== 'string'
  ) {
    return { ok: false, message: 'All fields are required.' }
  }

  if (password.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' }
  }

  if (!['ADMIN', 'STAFF', 'SHOPPER'].includes(role)) {
    return { ok: false, message: 'Invalid role selected.' }
  }

  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existing) {
    return { ok: false, message: 'Email already exists.' }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role as 'ADMIN' | 'STAFF' | 'SHOPPER',
    },
  })

  return { ok: true, message: 'User created successfully.' }
}
