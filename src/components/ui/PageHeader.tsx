import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: ReactNode
}

/**
 * Page-level header with title, optional subtitle, and an optional
 * right-side slot (e.g. action buttons).
 */
export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-deep-green dark:text-card">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 font-body text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
