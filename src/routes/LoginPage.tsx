import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

import { useAuth } from '../context/AuthContext'
import { useDevPreview } from '../context/DevPreviewContext'

export function LoginPage() {
  const { session, login, expired } = useAuth()
  const { exitPreview } = useDevPreview()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (session) return <Navigate to={`/${session.account.role}/home`} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await login(String(fields.get('email')), String(fields.get('password')))
      exitPreview()
    } catch (failure) {
      setError(failure instanceof Error && !(failure instanceof TypeError)
        ? failure.message : 'Sign-in is temporarily unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-card dark:bg-dark-bg flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-sm">
        {/* Page heading */}
        <h1 className="font-heading text-3xl font-bold text-deep-green dark:text-card mb-1">
          Sign in
        </h1>
        <p className="font-body text-sm text-deep-green/70 dark:text-card/70 mb-6">
          Use the email and password assigned to you.
        </p>

        {/* Sign-in card */}
        <div className="bg-card dark:bg-dark-card rounded-2xl p-6 space-y-5">

          {(error || expired) && (
            <p role="alert" className="text-sm font-medium text-deep-green dark:text-card">
              {error || 'Your session expired. Sign in again.'}
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="font-body text-sm font-medium text-deep-green dark:text-card"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                name="email" required maxLength={100}
                className="
                  w-full rounded-xl border border-deep-green dark:border-card
                  bg-card dark:bg-dark-bg
                  px-4 py-2.5
                  font-body text-base text-deep-green dark:text-card
                  placeholder:text-deep-green/40 dark:placeholder:text-card/40
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0
                "
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="font-body text-sm font-medium text-deep-green dark:text-card"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password" name="password" required maxLength={256}
                className="
                  w-full rounded-xl border border-deep-green dark:border-card
                  bg-card dark:bg-dark-bg
                  px-4 py-2.5
                  font-body text-base text-deep-green dark:text-card
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0
                "
              />
            </div>

            <Button type="submit" disabled={busy} variant="primary" className="mt-2 w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="border-t border-deep-green/20 dark:border-card/10 pt-4 text-center space-y-1">
              <p className="font-body text-xs text-deep-green/60 dark:text-card/60">
                Milestone 1.2 — Development Preview Mode
              </p>
              <Link
                to="/dev"
                className="inline-block font-body text-xs font-semibold text-deep-green dark:text-card hover:underline"
              >
                Open Role Selector (/dev) →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
