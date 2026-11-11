import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  children?: ReactNode
}

/**
 * Centered empty-state block with an illustrative SVG icon, title, and
 * description. An optional children slot accepts action buttons.
 */
export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {/* Simple SVG icon: circle with a horizontal line */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        fill="none"
        className="h-12 w-12 text-slate-300 dark:text-slate-600"
        aria-hidden="true"
      >
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" />
        <line
          x1="14"
          y1="24"
          x2="34"
          y2="24"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>

      <div className="max-w-xs">
        <p className="font-heading text-lg font-semibold text-deep-green dark:text-card">
          {title}
        </p>
        <p className="mt-1 font-body text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      {children && <div className="mt-2 flex gap-2">{children}</div>}
    </div>
  )
}
