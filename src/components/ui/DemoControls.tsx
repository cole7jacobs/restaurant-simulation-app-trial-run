import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from './Button'
import { demoKey } from '../../lib/demo'

export function DemoControls() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const student = pathname.startsWith('/demo/student')
  function reset() {
    for (let round = 2; round <= 7; round++) sessionStorage.removeItem(demoKey(round))
    navigate('/demo/student/home', { replace: true })
  }
  return <div className="border-b border-deep-green/20 bg-card px-4 py-2 text-deep-green dark:bg-dark-card dark:text-card">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 text-sm">
      <span className="grow">Demo Mode · Demo Bistro · Q5. Changes stay in this browser and do not recalculate results; the FORTRAN simulation runs externally. Results are fictional sample data.</span>
      <Button size="sm" variant="outlined" onClick={() => navigate(student ? '/demo/professor/home' : '/demo/student/home')}>Switch View</Button>
      <Button size="sm" variant="outlined" onClick={reset}>Reset Demo</Button>
      <Button size="sm" variant="outlined" to="/login">Exit Demo</Button>
    </div>
  </div>
}
