import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor: string
  children: ReactNode
  hint?: string
}

/**
 * Form field wrapper: label → input slot → optional hint text.
 * Input children stretch to full width via the `w-full` class applied
 * to this wrapper's inner content area.
 */
export function FormField({ label, htmlFor, children, hint }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-body text-sm font-medium text-deep-green dark:text-card"
      >
        {label}
      </label>

      <div className="w-full">{children}</div>

      {hint && (
        <p className="font-body text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  )
}
