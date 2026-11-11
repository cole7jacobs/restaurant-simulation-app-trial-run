import { Link } from 'react-router-dom'

/**
 * Fallback page for unrecognized routes.
 * Rendered by the catch-all Route path="*" in App.tsx.
 */
export function NotFoundPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-dark-bg flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="font-heading text-6xl font-bold text-primary">404</h1>
        <p className="font-body text-lg text-deep-green dark:text-card">
          This page does not exist.
        </p>
        <Link
          to="/login"
          className="
            inline-flex items-center font-body text-sm font-medium
            text-deep-green dark:text-card underline underline-offset-4
            hover:text-primary transition-colors
          "
        >
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
