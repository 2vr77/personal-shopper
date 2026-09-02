import { Suspense } from 'react'
import Link from 'next/link'

import { logout } from '@/app/actions/auth'
import { Nav } from '@/components/nav'
import { SearchBox } from '@/components/search-box'
import { getCurrentUser } from '@/lib/dal'

/**
 * The layout renders the shell but deliberately does not gate access — layouts
 * do not re-run on every navigation, and they cannot stop nested segments from
 * rendering. Each page calls `requireUser()`/`requireRole()` itself.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface px-4 py-4 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <Link
          href="/dashboard"
          className="mb-4 hidden px-3 text-sm font-semibold tracking-tight lg:block"
        >
          Personal Shopper
        </Link>
        <Nav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-3 sm:px-6">
          <SearchBox />
          {/* Streams separately so the session lookup never delays the page. */}
          <Suspense fallback={<div className="h-8 w-24" />}>
            <UserMenu />
          </Suspense>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

async function UserMenu() {
  const user = await getCurrentUser()
  if (!user) return null

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight">{user.name}</p>
        <p className="text-xs capitalize text-muted">{user.role.toLowerCase()}</p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
