import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'

type NavigationItem = { label: string; to: string; active: boolean }

export function NavigationDrawer({ items }: { items: NavigationItem[] }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    closeButton.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
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
      trigger.current?.focus()
    }
  }, [open])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <button ref={trigger} type="button" className="navigation-menu-button"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open} aria-controls="student-navigation-drawer"
        onClick={() => setOpen((previous) => !previous)}>
        <span className="navigation-menu-icon" aria-hidden="true"><span /><span /><span /></span>
      </button>
      {createPortal(
        <div className="navigation-drawer-layer" hidden={!open}>
          <div className="navigation-drawer-scrim" data-testid="student-navigation-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
          <div ref={panel} className="navigation-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="student-drawer-title">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.14em] opacity-70">SampleSlice</p>
                <h2 id="student-drawer-title" className="font-heading text-2xl font-extrabold">Student navigation</h2>
              </div>
              <button ref={closeButton} type="button" className="navigation-drawer-close" aria-label="Close navigation menu"
                onClick={() => setOpen(false)}>×</button>
            </div>
            <nav id="student-navigation-drawer" aria-label="Student navigation">
              <ul className="space-y-1">
                {items.map(({ label, to, active }) => (
                  <li key={to}>
                    <Link to={to} aria-current={active ? 'page' : undefined}
                      className="navigation-drawer-link" onClick={() => setOpen(false)}>
                      {label}<span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
