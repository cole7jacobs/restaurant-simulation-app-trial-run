import type { ReactNode } from 'react'

type BadgeVariant = 'submitted' | 'draft' | 'pending' | 'info'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  submitted: 'bg-deep-green text-card dark:bg-card dark:text-deep-green',
  draft: 'bg-alert/25 text-deep-green dark:bg-alert/30 dark:text-card',
  pending: 'bg-deep-green/10 text-deep-green dark:bg-card/10 dark:text-card',
  info: 'bg-card text-deep-green dark:bg-dark-card dark:text-card',
}

/**
 * Status badge component with variant-based colour coding.
 */
export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${variantStyles[variant]}`}
    >
      {children}
    </span>
  )
}
