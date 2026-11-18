import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from './Button'
import { demoKey, demoQ7Key } from '../../lib/demo'

export function DemoControls() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const student = pathname.startsWith('/demo/student')
  function reset() {
    for (let round = 2; round <= 7; round++) sessionStorage.removeItem(demoKey(round))
    sessionStorage.removeItem(demoQ7Key)
    navigate('/demo/student/home', { replace: true })
  }
  return <div className="border-t border-deep-green/20 px-4 py-2 text-deep-green dark:border-card/10 dark:text-card">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
      <p className="w-full font-heading text-xl font-extrabold sm:w-auto sm:grow sm:text-2xl">Demo Mode · Team 1: Demo Bistro</p>
      <div role="group" aria-label="Demo view" className="flex flex-wrap gap-2">
        <Button size="sm" variant={student ? 'primary' : 'outlined'} aria-pressed={student}
          onClick={() => navigate('/demo/student/home')}>Student View</Button>
        <Button size="sm" variant={!student ? 'primary' : 'outlined'} aria-pressed={!student}
          onClick={() => navigate('/demo/professor/home')}>Professor View</Button>
      </div>
      <Button size="sm" variant="outlined" onClick={reset}>Reset Demo</Button>
      <Button size="sm" variant="outlined" onClick={() => { sessionStorage.removeItem(demoQ7Key); navigate('/login') }}>Exit Demo</Button>
    </div>
  </div>
}

export function DemoFooter() {
  return <footer className="mx-auto w-full max-w-6xl px-4 pb-4 font-body text-xs leading-relaxed text-deep-green/70 dark:text-card/70">
    Changes stay in this browser and do not recalculate results; the FORTRAN simulation runs externally. Q5 results are sample data; Q7 results come from the file you import.
  </footer>
}
