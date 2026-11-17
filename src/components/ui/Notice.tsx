import type { ReactNode } from 'react'

type NoticeVariant = 'warning' | 'info' | 'success' | 'error'

interface NoticeProps {
  variant?: NoticeVariant
  children: ReactNode
  className?: string
}

const styles: Record<NoticeVariant, string> = {
  warning: 'border-alert bg-alert/15',
  error: 'border-alert border-2 bg-alert/20',
  info: 'border-deep-green/30 bg-deep-green/5 dark:border-card/20 dark:bg-card/5',
  success: 'border-primary bg-primary/20',
}

const icons: Record<NoticeVariant, string> = {
  warning: '⚠',
  error: '!',
  info: 'i',
  success: '✓',
}

/**
 * Message box for warnings, errors, confirmations and notes.
 * Uses only design-system colors; the icon means the message never relies on color alone.
 * Errors are announced to screen readers as alerts, confirmations as status updates.
 */
export function Notice({ variant = 'warning', children, className = '' }: NoticeProps) {
  const role = variant === 'error' ? 'alert' : variant === 'success' ? 'status' : undefined

  return (
    <div
      role={role}
      className={`flex gap-3 rounded-sm border border-l-4 p-3 font-body text-sm text-deep-green dark:text-card ${styles[variant]} ${className}`}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-deep-green text-xs font-bold text-card dark:bg-card dark:text-deep-green"
      >
        {icons[variant]}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
