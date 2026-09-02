'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Navigates to /search rather than filtering in place, so a search result page
 * is linkable and survives a refresh.
 */
export function SearchBox({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const q = value.trim()
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
      }}
      className="relative w-full max-w-xs"
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search orders, customers, products…"
        aria-label="Search"
        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-muted/70"
      />
    </form>
  )
}
