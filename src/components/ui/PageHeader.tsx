import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  id?: string
  subtitle?: string
  children?: ReactNode
}

/**
 * Page-level header with title, optional subtitle, and an optional
 * right-side slot (e.g. action buttons).
 */
export function PageHeader({ title, id, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 id={id} className="font-heading text-3xl font-extrabold uppercase leading-none tracking-wide text-deep-green sm:text-4xl dark:text-card">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 font-body text-xs font-medium uppercase tracking-[0.15em] text-deep-green/75 dark:text-card/75">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
