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
      className={`tile-entrance bg-beige dark:bg-dark-card rounded-sm p-4 sm:p-5 border border-primary dark:border-card/10 ${className}`}
    >
      {children}
    </div>
  )
}
