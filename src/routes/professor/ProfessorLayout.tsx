import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom'
import { DarkModeToggle } from '../../components/ui/DarkModeToggle'
import { Button } from '../../components/ui/Button'
import { DevPreviewBanner } from '../../components/ui/DevPreviewBanner'
import { useDevPreview } from '../../context/DevPreviewContext'

const NAV_TABS = [
  { label: 'Home', to: '/professor/home' },
  { label: 'Submissions', to: '/professor/submissions' },
  { label: 'RFI Generation', to: '/professor/rfi' },
  { label: 'FR.LST Import', to: '/professor/import' },
] as const

export function ProfessorLayout() {
  const { exitPreview } = useDevPreview()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const teamReview = useMatch('/professor/team-review/:teamId')

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col">
      {/* Top navigation bar */}
      <header className="border-b border-deep-green/10 dark:border-card/10 px-4">
        <nav
          className="max-w-5xl mx-auto flex flex-wrap items-center gap-2 py-2"
          aria-label="Professor navigation"
        >
          {/* Nav tabs */}
          <div className="flex flex-wrap items-center gap-1 grow">
            {NAV_TABS.map(({ label, to }) => {
              const isCurrent = pathname.toLowerCase().replace(/\/+$/, '') === to
              const isSection = Boolean(teamReview) && label === 'Submissions'

              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={isCurrent ? 'page' : isSection ? 'location' : undefined}
                  className={[
                    'px-2 sm:px-4 py-2 rounded-full font-body text-sm font-medium transition-colors',
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
          <div className="ml-auto flex items-center gap-3">
            {/* Phase 2: replace with actual user name from auth session */}
            <span className="font-body text-sm text-deep-green dark:text-card hidden sm:block">
              Professor
            </span>
            <Button
              variant="outlined"
              className="py-1.5 px-4 text-sm"
              onClick={() => {
                exitPreview()
                navigate('/login')
              }}
            >
              Exit preview
            </Button>
            <DarkModeToggle />
          </div>
        </nav>
      </header>

      {/* Dev preview banner — hidden when not in preview mode */}
      <DevPreviewBanner />

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
