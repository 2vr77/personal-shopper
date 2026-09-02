import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="text-xl font-semibold">We could not find that page</h1>
      <Link href="/dashboard" className="text-sm text-accent hover:underline">
        Back to the dashboard
      </Link>
    </main>
  )
}
