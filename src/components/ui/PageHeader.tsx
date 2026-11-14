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
        <span
          aria-hidden="true"
          className="mb-2 block h-1 w-10 rounded-full bg-primary"
        />
        <h1 className="font-heading text-2xl font-bold tracking-tight text-deep-green sm:text-3xl dark:text-card">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 font-body text-sm text-deep-green/75 dark:text-card/75">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
