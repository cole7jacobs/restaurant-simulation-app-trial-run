import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { DarkModeToggle } from '../../components/ui/DarkModeToggle'
import { Button } from '../../components/ui/Button'
import { DevPreviewBanner } from '../../components/ui/DevPreviewBanner'
import { useDevPreview } from '../../context/DevPreviewContext'

const NAV_TABS = [
  { label: 'Home', to: '/student/home' },
  { label: 'Decisions', to: '/student/decisions' },
  { label: 'Review', to: '/student/review' },
  { label: 'Results', to: '/student/results' },
] as const

/**
 * Student layout shell — rendered for all /student/* routes.
 *
 * Contains:
 *   - Top navigation tabs (Home, Decisions, Review, Results)
 *   - Team name and round number from DevPreview context (Phase 2: populated from auth session)
 *   - Sign out button (Phase 2: calls auth logout)
 *   - Dark mode toggle
 *   - DevPreviewBanner (dev-preview mode indicator)
 *   - <Outlet /> where child routes render their page content
 *
 * Matches the navigation bar shown in the design system mockup.
 */
export function StudentLayout() {
  const { teamName, roundNumber, exitPreview } = useDevPreview()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col">
      {/* Top navigation bar */}
      <header className="border-b border-deep-green/10 dark:border-card/10 px-4">
        <nav
          className="max-w-5xl mx-auto flex flex-wrap items-center gap-2 py-2"
          aria-label="Student navigation"
        >
          {/* Nav tabs */}
          <div className="flex flex-wrap items-center gap-1 grow">
            {NAV_TABS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'px-2 sm:px-4 py-2 rounded-full font-body text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-deep-green text-white dark:bg-primary dark:text-deep-green'
                      : 'text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right-side controls */}
          <div className="ml-auto flex items-center gap-3">
            {/* Team name and round number from DevPreview context */}
            <span className="font-body text-sm text-deep-green dark:text-card hidden sm:block">
              {teamName} · Round {roundNumber}
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

      {/* DevPreviewBanner — shown between header and main when dev preview is active */}
      <DevPreviewBanner />

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
