import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { demoKey, demoQ7Key, demoResultsPreference, demoLeaderboardPreference } from '../../lib/demo'

export function DemoControls() {
  const navigate = useNavigate()
  function reset() {
    for (let round = 2; round <= 7; round++) sessionStorage.removeItem(demoKey(round))
    sessionStorage.removeItem(demoQ7Key)
    sessionStorage.removeItem(demoResultsPreference)
    sessionStorage.removeItem(demoLeaderboardPreference)
    navigate('/demo/student/results', { replace: true })
  }
  return <div className="border-t border-deep-green/20 px-4 py-2 text-deep-green dark:border-card/10 dark:text-card">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
      <p className="w-full font-heading text-xl font-extrabold sm:w-auto sm:grow sm:text-2xl">Demo Mode · Team 1: Demo Bistro</p>
      <Button size="sm" variant="outlined" onClick={reset}>Reset Demo</Button>
      <Button size="sm" variant="outlined" onClick={() => { sessionStorage.removeItem(demoQ7Key); navigate('/login') }}>Exit Demo</Button>
    </div>
  </div>
}

export function DemoFooter() {
  return <footer className="mx-auto w-full max-w-6xl px-4 pb-4 font-body text-xs leading-relaxed text-deep-green/70 dark:text-card/70">
    Changes stay in this browser and do not recalculate results; the FORTRAN simulation runs externally. Q1–Q5 results are from earlier simulation runs.
  </footer>
}
