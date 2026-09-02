import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

import { db } from '@/lib/db'
import { readSessionCookie } from '@/lib/session'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: Role
}

/**
 * The one authorization gate. Every page, Server Action and Route Handler that
 * touches data calls this (directly or via `requireRole`), because proxy.ts only
 * does an optimistic cookie check and Server Actions are reachable by direct POST.
 *
 * `cache` dedupes it to a single query per render pass.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSessionCookie()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, active: true },
  })

  // A user deactivated mid-session must lose access before their JWT expires.
  if (!user || !user.active) return null

  return { id: user.id, name: user.name, email: user.email, role: user.role }
})

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/** Ranked so a check can ask for "STAFF or better" without listing roles. */
const ROLE_RANK: Record<Role, number> = {
  SHOPPER: 1,
  STAFF: 2,
  ADMIN: 3,
}

export function hasRole(user: CurrentUser, minimum: Role): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum]
}

export async function requireRole(minimum: Role): Promise<CurrentUser> {
  const user = await requireUser()
  if (!hasRole(user, minimum)) redirect('/dashboard?denied=1')
  return user
}

/**
 * For Server Actions, which should return an error rather than redirect so the
 * form can surface it.
 */
export async function authorize(
  minimum: Role
): Promise<{ ok: true; user: CurrentUser } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'You are signed out. Please sign in again.' }
  if (!hasRole(user, minimum)) {
    return { ok: false, error: 'You do not have permission to do that.' }
  }
  return { ok: true, user }
}
