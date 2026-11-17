import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDevPreview } from '../../context/DevPreviewContext'
import { Button } from './Button'

export function SessionControls() {
  const { session, logout } = useAuth()
  const { exitPreview } = useDevPreview()
  const navigate = useNavigate()
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function leave() {
    setError(false)
    setBusy(true)
    try {
      if (session) await logout()
      exitPreview()
      navigate('/login', { replace: true })
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {error && <span role="alert" className="text-sm">Sign-out failed. Try again.</span>}
      <Button variant="outlined" className="text-sm" disabled={busy} onClick={leave}>
        {session ? 'Sign out' : 'Exit preview'}
      </Button>
    </>
  )
}
