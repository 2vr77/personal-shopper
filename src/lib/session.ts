// No `server-only` guard here: proxy.ts imports `decrypt` for its optimistic
// redirect check, and proxy is bundled separately from the app's server graph.
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { Role } from '@prisma/client'

const SESSION_COOKIE = 'ps_session'
const SESSION_DAYS = 7

const secret = process.env.SESSION_SECRET
if (!secret) {
  throw new Error(
    'SESSION_SECRET is not set. Copy .env.example to .env and fill it in.'
  )
}
const encodedKey = new TextEncoder().encode(secret)

export type SessionPayload = {
  userId: string
  role: Role
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(encodedKey)
}

export async function decrypt(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ['HS256'],
    })
    if (typeof payload.userId !== 'string' || typeof payload.role !== 'string') {
      return null
    }
    return { userId: payload.userId, role: payload.role as Role }
  } catch {
    // Expired or tampered token — treat as signed out.
    return null
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  const token = await encrypt(payload)
  const cookieStore = await cookies()

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Plain http on localhost would drop a Secure cookie, so only set it in prod.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value)
}

export { SESSION_COOKIE }
