import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

/**
 * Shared Card wrapper component matching the design system specification.
 * White / light-orange bg on light mode, dark-card (#242424) on dark mode.
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-card dark:bg-dark-card rounded-2xl p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}
