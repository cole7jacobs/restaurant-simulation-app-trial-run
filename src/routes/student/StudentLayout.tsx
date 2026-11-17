import { NavLink, Outlet } from 'react-router-dom'
import { DarkModeToggle } from '../../components/ui/DarkModeToggle'
import { SessionControls } from '../../components/ui/SessionControls'
import { useAuth } from '../../context/AuthContext'
import { DevPreviewBanner } from '../../components/ui/DevPreviewBanner'
import { useDevPreview } from '../../context/DevPreviewContext'

const NAV_TABS = [
  { label: 'Home', to: '/student/home' },
  { label: 'Decisions', to: '/student/decisions' },
  { label: 'Review', to: '/student/review' },
  { label: 'Results', to: '/student/results' },
] as const

export function StudentLayout() {
  const { teamName, roundNumber } = useDevPreview()
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-card dark:bg-dark-bg flex flex-col">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 border-b border-deep-green/20 bg-card/90 backdrop-blur dark:border-card/10 dark:bg-dark-bg/90">
        <nav
          className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-0 px-4 py-1"
          aria-label="Student navigation"
        >
          {/* Wordmark */}
          <img
            src="/sample-slice-logo.png"
            alt="Sample Slice"
            className="order-1 h-16 w-16 shrink-0 object-contain"
          />
          <span className="order-1 shrink-0 font-heading text-xl font-extrabold uppercase tracking-wide text-deep-green dark:text-card">
            Sample<span className="text-primary">Slice</span>
          </span>

          {/* Nav tabs */}
          <div className="order-2 flex w-full items-center gap-0 overflow-x-auto sm:w-auto sm:grow">
            {NAV_TABS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 sm:px-4 border-b-2 font-body text-sm font-medium uppercase tracking-wider transition-colors',
                    isActive
                      ? 'border-primary text-deep-green dark:text-card'
                      : 'border-transparent text-deep-green/70 dark:text-card/70 hover:text-deep-green dark:hover:text-card',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right-side controls */}
          <div className="order-1 ml-auto flex items-center gap-3 sm:order-3">
            {/* Team name and round number from DevPreview context */}
            <span className="font-body text-sm text-deep-green dark:text-card hidden sm:block">
              {session ? session.account.teamName : `${teamName} · Round ${roundNumber}`}
            </span>
            <SessionControls />
            <DarkModeToggle />
          </div>
        </nav>
      </header>

      {/* DevPreviewBanner — shown between header and main when dev preview is active */}
      {!session && <DevPreviewBanner />}

      {/* Page content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 sm:py-5">
        <Outlet />
      </main>
    </div>
  )
}
