import { DemoControls, DemoFooter } from '../../components/ui/DemoControls'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { SkipLink } from '../../components/ui/SkipLink'
import { usePageTitle } from '../../components/ui/usePageTitle'
import { DarkModeToggle } from '../../components/ui/DarkModeToggle'
import { SessionControls } from '../../components/ui/SessionControls'
import { useAuth } from '../../context/AuthContext'
import { DevPreviewBanner } from '../../components/ui/DevPreviewBanner'
import { useDevPreview } from '../../context/DevPreviewContext'

const NAV_TABS = [
  { label: 'Home', to: '/student/home' },
  { label: 'Decisions', to: '/student/decisions' },
  { label: 'Results', to: '/student/results' },
  { label: 'Leaderboard', to: '/student/leaderboard' },
] as const

export function StudentLayout() {
  const { teamName, roundNumber } = useDevPreview()
  const { session } = useAuth()
  const { pathname } = useLocation()
  const demo = pathname.startsWith('/demo/')
  const studentPath = pathname.replace(/^\/demo/, '').replace(/\/+$/, '').toLowerCase()
  const isDecisionPage = studentPath === '/student/decisions' || studentPath === '/student/review'
  const [actionTarget, setActionTarget] = useState<HTMLDivElement | null>(null)
  usePageTitle(isDecisionPage ? 'Decisions' : NAV_TABS.find((tab) => studentPath.startsWith(tab.to))?.label ?? 'Student')

  return (
    <div className={`${isDecisionPage ? 'h-dvh overflow-hidden' : 'min-h-screen'} bg-card dark:bg-dark-bg flex flex-col`}>
      <SkipLink />
      {/* Top navigation bar */}
      <header className="sticky top-0 z-10 shrink-0 border-b border-deep-green/20 bg-card/90 backdrop-blur dark:border-card/10 dark:bg-dark-bg/90">
        {demo && <DemoControls />}
        <nav
          className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-0 px-4 py-1"
          aria-label="Student navigation"
        >
          {/* Wordmark */}
          <img
            src="/sample-slice-icon.png"
            alt=""
            className="order-1 h-[84px] w-[84px] shrink-0 object-contain"
          />
          <span className="order-1 shrink-0 font-heading text-xl font-extrabold uppercase tracking-wide text-deep-green dark:text-card">
            Sample<span className="text-primary">Slice</span>
          </span>

          {/* Nav tabs */}
          <div className="order-2 flex w-full items-center gap-0 flex-wrap sm:w-auto sm:grow">
            {NAV_TABS.filter(({ label }) => (session && !demo) || label !== 'Leaderboard').map(({ label, to }) => (
              <NavLink
                key={to}
                to={demo ? '/demo' + to : to}
                className={({ isActive }) =>
                  [
                    'inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 sm:px-4 border-b-2 font-body text-sm font-medium uppercase tracking-wider transition-colors',
                    isActive || (to === '/student/decisions' && studentPath === '/student/review')
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
              {demo ? 'Demo Bistro · Round 5' : session ? session.account.teamName : `${teamName} · Round ${roundNumber}`}
            </span>
            {!demo && <SessionControls />}
            <DarkModeToggle />
          </div>
        </nav>
      </header>
      <div className={isDecisionPage ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : 'flex-1'}>
        {!demo && !session && <DevPreviewBanner />}
        <main id="main-content" tabIndex={-1} className="max-w-6xl mx-auto w-full px-4 py-4 sm:py-5 focus:outline-none">
          <Outlet context={{ actionTarget }} />
        </main>
        {demo && <DemoFooter />}
      </div>
      {isDecisionPage && <div ref={setActionTarget} className="shrink-0" />}
    </div>
  )
}
