import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useDevPreview } from '../context/DevPreviewContext'

/**
 * DevPreviewSelector — standalone page (no layout shell) that lets a developer
 * choose which role to preview without going through real authentication.
 *
 * Route: /dev
 */
export function DevPreviewSelector() {
  const navigate = useNavigate()
  const { role, setRole, exitPreview } = useDevPreview()

  function pickRole(next: 'student' | 'professor') {
    setRole(next)
    navigate(next === 'student' ? '/student/home' : '/professor/home', {
      replace: true,
    })
  }

  function leavePreview() {
    exitPreview()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-card dark:bg-dark-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        {/* Card */}
        <div className="rounded-2xl bg-card dark:bg-dark-card shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="font-heading text-3xl font-bold text-deep-green dark:text-card">
              Development Preview
            </h1>
            <p className="font-body text-sm text-deep-green/70 dark:text-card/70">
              Authentication is not yet implemented. Select a role to explore
              the interface.
            </p>
          </div>

          {/* Amber alert */}
          <div
            className={[
              'rounded-xl px-4 py-3',
              'bg-alert/15 dark:bg-alert/15',
              'border border-alert dark:border-alert',
              'text-deep-green dark:text-card',
              'font-body text-sm',
            ].join(' ')}
            role="note"
          >
            ⚠ This mode bypasses authentication. No data is saved. For
            development only.
          </div>

          {/* Role buttons */}
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              className="w-full py-3 text-base"
              onClick={() => pickRole('student')}
            >
              Preview as Student
            </Button>
            <Button
              variant="outlined"
              className="w-full py-3 text-base"
              onClick={() => pickRole('professor')}
            >
              Preview as Professor
            </Button>
          </div>

          {/* Currently previewing section — only shown when already in a role */}
          {role && (
            <div className="border-t border-deep-green/20 dark:border-card/10 pt-4 space-y-2">
              <p className="font-body text-sm text-deep-green dark:text-card text-center">
                Currently previewing as{' '}
                <span className="font-medium capitalize">{role}</span>.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={leavePreview}
                  className="font-body text-sm text-deep-green/60 dark:text-card/60 underline underline-offset-2 hover:text-deep-green dark:hover:text-card transition-colors"
                >
                  Exit preview
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="font-body text-xs text-center text-deep-green/40 dark:text-card/40">
          Restaurant Simulation App — Milestone 1.2 Dev Build
        </p>
      </div>
    </div>
  )
}
