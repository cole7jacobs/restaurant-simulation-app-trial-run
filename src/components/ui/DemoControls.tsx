import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { demoKey, demoQ7Key, demoResultsPreference, demoLeaderboardPreference } from '../../lib/demo'

export function DemoControls() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [quarter, setQuarter] = useState(5)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    function updateQuarter() {
      try {
        const value = pathname.endsWith('/leaderboard')
          ? JSON.parse(sessionStorage.getItem(demoLeaderboardPreference) || '{}').round
          : pathname.endsWith('/results') ? Number(sessionStorage.getItem(demoResultsPreference)) : 5
        setQuarter([1, 2, 3, 4, 5].includes(value) ? value : 5)
      } catch { setQuarter(5) }
    }
    updateQuarter()
    window.addEventListener('demo-quarter-change', updateQuarter)
    return () => window.removeEventListener('demo-quarter-change', updateQuarter)
  }, [pathname])
  useEffect(() => {
    function focus(event: FocusEvent) {
      const target = event.target
      if (window.matchMedia?.('(max-width: 767px)').matches && target instanceof HTMLInputElement && !target.readOnly) setEditing(true)
    }
    function blur() { setEditing(false) }
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', blur)
    return () => { document.removeEventListener('focusin', focus); document.removeEventListener('focusout', blur) }
  }, [])
  function reset() {
    for (let round = 2; round <= 7; round++) sessionStorage.removeItem(demoKey(round))
    sessionStorage.removeItem(demoQ7Key)
    sessionStorage.removeItem(demoResultsPreference)
    sessionStorage.removeItem(demoLeaderboardPreference)
    navigate('/demo/student/results', { replace: true })
  }
  return <div role="region" aria-label="Demo controls" hidden={editing} className="fixed inset-x-3 z-50 mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-xl border border-deep-green/25 bg-card px-3 py-2 text-deep-green shadow-lg dark:border-card/20 dark:bg-dark-card dark:text-card" style={{ bottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
    <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
      <p className="text-center font-body text-xs font-semibold sm:text-sm">Demo Mode · Team 1: Demo Bistro · Q{quarter}</p>
      <div className="flex gap-2">
      <Button size="sm" variant="outlined" onClick={reset}>Reset Demo</Button>
      <Button size="sm" variant="outlined" onClick={() => { sessionStorage.removeItem(demoQ7Key); navigate('/login') }}>Exit Demo</Button>
      </div>
    </div>
  </div>
}

export function DemoFooter() {
  return <footer className="mx-auto w-full max-w-6xl px-4 pb-4 font-body text-xs leading-relaxed text-deep-green/70 dark:text-card/70">
    Changes stay in this browser and do not recalculate results; the FORTRAN simulation runs externally. Q1–Q5 results are from earlier simulation runs.
  </footer>
}
