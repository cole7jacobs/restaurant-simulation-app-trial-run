import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useDevPreview } from '../context/DevPreviewContext'

type Role = 'student' | 'professor'

/**
 * Login page — matches the sign-in screen mockup from the design system.
 *
 * Layout:
 *   - "I am a" role toggle (Student / Professor pill selector)
 *   - Email field
 *   - Password field
 *   - "Sign in" primary button
 *
 * In Milestone 1.2 Development Preview, clicking "Sign in" activates
 * preview mode for the selected role so the user can immediately explore.
 * Authentication will be implemented in Phase 2.
 */
export function LoginPage() {
  const [role, setRoleState] = useState<Role>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { setRole } = useDevPreview()
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // In dev preview mode: activate preview role and navigate to interface
    setRole(role)
    navigate(role === 'student' ? '/student/home' : '/professor/home', { replace: true })
  }

  return (
    <main className="min-h-screen bg-white dark:bg-dark-bg flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-sm">
        {/* Page heading */}
        <h1 className="font-heading text-3xl font-bold text-deep-green dark:text-card mb-1">
          Sign in
        </h1>
        <p className="font-body text-sm text-deep-green/70 dark:text-card/70 mb-6">
          Choose how you are using the app.
        </p>

        {/* Sign-in card */}
        <div className="bg-card dark:bg-dark-card rounded-2xl p-6 space-y-5">

          {/* Role toggle */}
          <div>
            <p className="font-body text-sm text-deep-green dark:text-card mb-2">I am a</p>
            <div className="flex rounded-full border border-deep-green dark:border-card overflow-hidden">
              <button
                type="button"
                onClick={() => setRoleState('student')}
                className={`
                  flex-1 py-2.5 font-body text-base font-medium transition-colors
                  ${role === 'student'
                    ? 'bg-deep-green text-white dark:bg-primary dark:text-deep-green'
                    : 'bg-transparent text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10'
                  }
                `}
                aria-pressed={role === 'student'}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setRoleState('professor')}
                className={`
                  flex-1 py-2.5 font-body text-base font-medium transition-colors
                  ${role === 'professor'
                    ? 'bg-primary text-deep-green'
                    : 'bg-transparent text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10'
                  }
                `}
                aria-pressed={role === 'professor'}
              >
                Professor
              </button>
            </div>
          </div>

          {/* Sign-in form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                required
                placeholder={role === 'student' ? 'student@lsu.edu' : 'professor@lsu.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  w-full rounded-xl border border-deep-green dark:border-card
                  bg-white dark:bg-dark-bg
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full rounded-xl border border-deep-green dark:border-card
                  bg-white dark:bg-dark-bg
                  px-4 py-2.5
                  font-body text-base text-deep-green dark:text-card
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0
                "
              />
            </div>

            <Button type="submit" variant="primary" className="mt-2 w-full">
              Sign in
            </Button>
          </form>

          {/* Dev preview quick-entry note */}
          <div className="border-t border-deep-green/10 dark:border-card/10 pt-4 text-center space-y-1">
            <p className="font-body text-xs text-deep-green/60 dark:text-card/60">
              Milestone 1.2 — Development Preview Mode
            </p>
            <Link
              to="/dev"
              className="inline-block font-body text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              Open Role Selector (/dev) →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
