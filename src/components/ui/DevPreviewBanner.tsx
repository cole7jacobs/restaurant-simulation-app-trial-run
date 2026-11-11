import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { useDevPreview } from '../../context/DevPreviewContext'
import type { DevRole } from '../../lib/dev-preview'

/**
 * DevPreviewBanner — full-width amber bar shown at the top of every page
 * when dev-preview mode is active.
 *
 * Placement: render above <Outlet /> inside StudentLayout / ProfessorLayout.
 * Hidden when role is null (not in preview mode).
 */
export function DevPreviewBanner() {
  const { role, setRole } = useDevPreview()
  const navigate = useNavigate()

  if (!role) return null

  const roleLabel = role === 'student' ? 'Student' : 'Professor'

  function switchRole(next: DevRole) {
    setRole(next)
    navigate(next === 'student' ? '/student/home' : '/professor/home', {
      replace: true,
    })
  }

  function handleSignIn() {
    setRole(null)
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={[
        'w-full flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2',
        'bg-amber-50 dark:bg-amber-950/20',
        'border-b border-amber-200 dark:border-amber-800',
        'text-amber-800 dark:text-amber-200',
        'font-body text-sm',
      ].join(' ')}
      role="status"
      aria-label="Development preview active"
    >
      {/* Left — label */}
      <span className="font-heading font-bold whitespace-nowrap">
        ⚠ Development Preview
      </span>

      {/* Middle — current role badge */}
      <span className="flex items-center gap-2 flex-1 min-w-max">
        <span>Viewing as:</span>
        <span
          className={[
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            role === 'student'
              ? 'bg-primary/20 text-primary dark:bg-primary/30'
              : 'bg-deep-green/15 text-deep-green dark:bg-deep-green/40 dark:text-amber-100',
          ].join(' ')}
        >
          {roleLabel}
        </span>
      </span>

      {/* Right — action buttons */}
      <div className="flex items-center gap-2 ml-auto">
        {role !== 'student' && (
          <Button
            variant="outlined"
            className="py-1.5 px-4 text-xs border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
            onClick={() => switchRole('student')}
          >
            Switch to Student
          </Button>
        )}
        {role !== 'professor' && (
          <Button
            variant="outlined"
            className="py-1.5 px-4 text-xs border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
            onClick={() => switchRole('professor')}
          >
            Switch to Professor
          </Button>
        )}
        <Button
          variant="outlined"
          className="py-1.5 px-4 text-xs border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30"
          onClick={handleSignIn}
        >
          Sign in
        </Button>
      </div>
    </div>
  )
}
