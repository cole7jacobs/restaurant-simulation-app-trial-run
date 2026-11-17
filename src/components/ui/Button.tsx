import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * - `primary`  — gold filled button for the one main action on a screen
   *                (e.g. "Save and continue", "Submit", "Sign in")
   * - `outlined` — bordered button for secondary actions (e.g. "Sign out")
   */
  variant?: 'primary' | 'outlined'
  /**
   * - `sm` — compact: py-1.5 px-4 text-sm
   * - `md` — default: py-2.5 px-6 text-base
   * - `lg` — large:   py-3   px-8 text-lg
   */
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

/**
 * Shared Button component matching the design system specification.
 *
 * Design system reference:
 *   "The gold main button is for the one main action on a screen…
 *    The outlined button is for smaller actions like Sign out."
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const sizes = {
    sm: 'py-1.5 px-4 text-sm',
    md: 'py-2 px-5 text-sm',
    lg: 'py-2.5 px-6 text-base',
  }

  const base = [
    'inline-flex items-center justify-center',
    'rounded-sm uppercase tracking-wider',
    `font-body font-medium ${sizes[size]}`,
    'transition duration-150 active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' ')

  const variants = {
    primary: [
      'bg-primary text-deep-green',
      'shadow-sm hover:bg-primary/85 hover:shadow',
      'dark:bg-primary dark:text-deep-green',
    ].join(' '),
    outlined: [
      'border border-deep-green text-deep-green bg-transparent',
      'hover:bg-deep-green/5',
      'dark:border-card dark:text-card dark:hover:bg-card/10',
    ].join(' '),
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
