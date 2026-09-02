import type { Metadata } from 'next'

import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in · Personal Shopper' }

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams
  const next = typeof searchParams.next === 'string' ? searchParams.next : undefined

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Personal Shopper</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage your orders</p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  )
}
