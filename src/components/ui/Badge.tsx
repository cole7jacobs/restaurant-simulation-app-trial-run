import type { ReactNode } from 'react'

type BadgeVariant = 'submitted' | 'draft' | 'pending' | 'info'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  submitted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400',
  info: 'bg-card text-deep-green dark:bg-dark-card dark:text-card',
}

/**
 * Status badge component with variant-based colour coding.
 */
export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]}`}
    >
      {children}
    </span>
  )
}
