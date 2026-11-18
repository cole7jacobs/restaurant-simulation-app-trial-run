import { useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useMatch } from 'react-router-dom'
import { DemoControls, DemoFooter } from '../../components/ui/DemoControls'
import { SkipLink } from '../../components/ui/SkipLink'
import { usePageTitle } from '../../components/ui/usePageTitle'
import { DarkModeToggle } from '../../components/ui/DarkModeToggle'
import { SessionControls } from '../../components/ui/SessionControls'
import { useAuth } from '../../context/AuthContext'
import { DevPreviewBanner } from '../../components/ui/DevPreviewBanner'

export function ProfessorLayout() {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const demo = pathname.startsWith('/demo/')
  const teamReview = useMatch('/professor/team-review/:teamId')
  const header = useRef<HTMLElement>(null)
  usePageTitle(teamReview ? 'Team Review' : 'Professor Dashboard')

  useLayoutEffect(() => {
    const element = header.current
    const shell = element?.parentElement
    if (!element || !shell) return
    const measure = () => shell.style.setProperty('--professor-header-height', element.offsetHeight + 'px')
    measure()
    window.addEventListener('resize', measure)
    let observer: ResizeObserver | undefined
    try {
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(measure)
        observer.observe(element)
      }
    } catch {
      observer?.disconnect()
    }
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      shell.style.removeProperty('--professor-header-height')
    }
  }, [])

  return (
    <div className="min-h-screen bg-card dark:bg-dark-bg flex flex-col">
      <SkipLink />
      <header ref={header} className="sticky top-0 z-10 shrink-0 border-b border-deep-green/20 bg-card/90 backdrop-blur dark:border-card/10 dark:bg-dark-bg/90">
        {demo && <DemoControls />}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1" aria-label="Professor header">
          <img src="/sample-slice-icon.png" alt="" className="order-1 h-[84px] w-[84px] shrink-0 object-contain" />
          <span className="order-1 shrink-0 font-heading text-xl font-extrabold uppercase tracking-wide text-deep-green dark:text-card">
            Sample<span className="text-primary">Slice</span>
          </span>
          <div className="order-1 ml-auto flex items-center gap-3 sm:order-3">
            <span className="hidden font-body text-sm text-deep-green sm:block dark:text-card">
              {session?.account.name ?? 'Professor'}
            </span>
            {!demo && <SessionControls />}
            <DarkModeToggle />
          </div>
        </div>
      </header>

      {!demo && !session && <DevPreviewBanner />}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 sm:py-5 focus:outline-none">
        <Outlet />
      </main>
      {demo && <DemoFooter />}
    </div>
  )
}
