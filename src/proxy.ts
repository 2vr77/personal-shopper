import { NextResponse, type NextRequest } from 'next/server'

import { decrypt, SESSION_COOKIE } from '@/lib/session'

const PUBLIC_PATHS = ['/login']

/**
 * Optimistic auth only — it reads the signed cookie and never touches the
 * database, because proxy runs on every request including prefetches. The real
 * check lives in the DAL (src/lib/dal.ts), close to the data.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.includes(pathname)

  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value)

  if (!session && !isPublic) {
    const url = new URL('/login', request.nextUrl)
    // Send the user back where they were headed once they sign in.
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
