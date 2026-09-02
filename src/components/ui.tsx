import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Small, shared presentational primitives. Deliberately plain components rather
// than a component library — the app only needs a consistent surface, and every
// one of these renders on the server.

export function Card({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        className
      )}
      {...props}
    />
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const buttonVariants = {
  primary:
    'bg-accent text-white hover:bg-indigo-700 disabled:bg-indigo-300',
  secondary:
    'border border-line bg-surface text-foreground hover:bg-slate-50 disabled:text-muted',
  danger:
    'border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:text-red-300',
} as const

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], className)}
      {...props}
    />
  )
}

export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants }) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], className)}
      {...props}
    />
  )
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  error?: string[]
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error?.length && <p className="text-xs text-muted">{hint}</p>}
      {error?.map((e) => (
        <p key={e} className="text-xs text-red-600">
          {e}
        </p>
      ))}
    </div>
  )
}

const controlBase =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted/70 disabled:bg-slate-50'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(controlBase, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlBase, 'min-h-20', className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(controlBase, 'pr-8', className)} {...props} />
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </p>
  )
}

/** Definition-list row used across the detail pages. */
export function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}
