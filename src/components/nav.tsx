'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Luggage,
  Ship,
  Truck,
  BarChart3,
  MessageCircle,
  FileText,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/purchase-batches', label: 'Purchase trips', icon: Luggage },
  { href: '/cargo-batches', label: 'Cargo', icon: Ship },
  { href: '/shipping', label: 'Shipping', icon: Truck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/inbox', label: 'Inbox', icon: MessageCircle },
  { href: '/message-templates', label: 'Templates', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 lg:flex-col">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-accent/10 text-accent'
                : 'text-slate-600 hover:bg-slate-100 hover:text-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
