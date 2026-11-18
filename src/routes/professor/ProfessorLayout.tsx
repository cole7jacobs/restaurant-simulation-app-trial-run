import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useMatch } from 'react-router-dom'
import { DemoControls, DemoFooter } from '../../components/ui/DemoControls'
import { SkipLink } from '../../components/ui/SkipLink'
import { usePageTitle } from '../../components/ui/usePageTitle'
import { DarkModeToggle } from '../../components/ui/DarkModeToggle'
import { SessionControls } from '../../components/ui/SessionControls'
import { useAuth } from '../../context/AuthContext'
import { DevPreviewBanner } from '../../components/ui/DevPreviewBanner'
import { professorSections } from './ProfessorWorkspace'

export function ProfessorLayout() {
  const { session } = useAuth()
  const { pathname, hash } = useLocation()
  const demo = pathname.startsWith('/demo/')
  const teamReview = useMatch('/professor/team-review/:teamId')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLElement>(null)
  const current = teamReview ? 'submissions' : hash.slice(1) || 'overview'
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

  useEffect(() => {
    if (!menuOpen) return
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    closeButton.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
      } else if (event.key === 'Tab' && panel.current) {
        const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
      menuButton.current?.focus()
    }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-card dark:bg-dark-bg flex flex-col">
      <SkipLink />
      <header ref={header} className="sticky top-0 z-10 shrink-0 border-b border-deep-green/20 bg-card/90 backdrop-blur dark:border-card/10 dark:bg-dark-bg/90">
        {demo && <DemoControls />}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1" aria-label="Professor header">
          <button ref={menuButton} type="button" className="professor-menu-button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen} aria-controls="professor-navigation-drawer"
            onClick={() => setMenuOpen((open) => !open)}>
            <span className="professor-menu-icon" aria-hidden="true"><span /><span /><span /></span>
            <span>Menu</span>
          </button>
          <img src="/sample-slice-icon.png" alt="" className="h-[84px] w-[84px] shrink-0 object-contain" />
          <span className="shrink-0 font-heading text-xl font-extrabold uppercase tracking-wide text-deep-green dark:text-card">
            Sample<span className="text-primary">Slice</span>
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-body text-sm text-deep-green sm:block dark:text-card">
              {session?.account.name ?? 'Professor'}
            </span>
            {!demo && <SessionControls />}
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <div className="professor-drawer-layer" hidden={!menuOpen}>
        <div className="professor-drawer-scrim" data-testid="professor-navigation-scrim" aria-hidden="true" onClick={() => setMenuOpen(false)} />
        <div ref={panel} className="professor-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="professor-drawer-title">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="professor-section-kicker">SampleSlice</p>
              <h2 id="professor-drawer-title" className="font-heading text-2xl font-extrabold">Professor menu</h2>
            </div>
            <button ref={closeButton} type="button" className="professor-drawer-close" aria-label="Close navigation menu"
              onClick={() => setMenuOpen(false)}>×</button>
          </div>
          <nav id="professor-navigation-drawer" aria-label="Professor navigation">
            <ul className="space-y-1">
              {professorSections.map(({ id, label }) => (
                <li key={id}>
                  <Link to={{ pathname: (demo ? '/demo' : '') + '/professor/home', hash: '#' + id }}
                    aria-current={current === id ? 'location' : undefined}
                    className="professor-drawer-link" onClick={() => setMenuOpen(false)}>
                    {label}<span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {!demo && !session && <DevPreviewBanner />}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 sm:py-5 focus:outline-none">
        <Outlet />
      </main>
      {demo && <DemoFooter />}
    </div>
  )
}
