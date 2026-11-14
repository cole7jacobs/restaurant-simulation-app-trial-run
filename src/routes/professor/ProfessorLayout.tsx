import { Link, Outlet, useLocation, useMatch } from 'react-router-dom'
import { DarkModeToggle } from '../../components/ui/DarkModeToggle'
import { SessionControls } from '../../components/ui/SessionControls'
import { useAuth } from '../../context/AuthContext'
import { DevPreviewBanner } from '../../components/ui/DevPreviewBanner'

const NAV_TABS = [
  { label: 'Home', to: '/professor/home' },
  { label: 'Submissions', to: '/professor/submissions' },
  { label: 'RFI Generation', to: '/professor/rfi' },
  { label: 'FR.LST Import', to: '/professor/import' },
] as const

export function ProfessorLayout() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const teamReview = useMatch('/professor/team-review/:teamId')

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 border-b border-deep-green/10 bg-white/90 px-4 backdrop-blur dark:border-card/10 dark:bg-dark-bg/90">
        <nav
          className="max-w-5xl mx-auto flex flex-wrap items-center gap-2 py-2"
          aria-label="Professor navigation"
        >
          {/* Nav tabs */}
          <div className="order-2 flex w-full items-center gap-1 overflow-x-auto sm:order-1 sm:w-auto sm:grow">
            {NAV_TABS.map(({ label, to }) => {
              const isCurrent = pathname.toLowerCase().replace(/\/+$/, '') === to
              const isSection = Boolean(teamReview) && label === 'Submissions'

              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={isCurrent ? 'page' : isSection ? 'location' : undefined}
                  className={[
                    'inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 sm:px-4 rounded-full font-body text-sm font-medium transition-colors',
                    isCurrent || isSection
                      ? 'bg-deep-green text-white dark:bg-primary dark:text-deep-green'
                      : 'text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10',
                  ].join(' ')}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Right-side controls */}
          <div className="order-1 ml-auto flex items-center gap-3 sm:order-2">
            {/* Phase 2: replace with actual user name from auth session */}
            <span className="font-body text-sm text-deep-green dark:text-card hidden sm:block">
              {session?.account.name ?? 'Professor'}
            </span>
            <SessionControls />
            <DarkModeToggle />
          </div>
        </nav>
      </header>

      {/* Dev preview banner — hidden when not in preview mode */}
      {!session && <DevPreviewBanner />}

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
