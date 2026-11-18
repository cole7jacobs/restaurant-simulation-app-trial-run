import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Account } from '../../worker/auth'

async function request(path: string, signal?: AbortSignal) {
  return fetch(`/api${path}`, { signal, cache: 'no-store' })
}

type Session = { account: Account; expiresAt: number }
type AuthState = {
  session: Session | null
  ready: boolean
  expired: boolean
  unavailable: boolean
}

const AuthContext = createContext<(AuthState & {
  login: (email: string, password: string) => Promise<Account>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  expire: () => void
}) | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null, ready: false, expired: false, unavailable: false,
  })
  const revision = useRef(0)
  const expire = useCallback(() => {
    revision.current += 1
    setState({ session: null, ready: true, expired: true, unavailable: false })
  }, [])

  const refresh = useCallback(async () => {
    const current = ++revision.current
    try {
      const response = await request('/auth/session')
      if (response.status === 401) {
        const { error } = await response.json()
        if (current !== revision.current) return
        setState((previous) => ({
          session: null, ready: true, unavailable: false,
          expired: previous.expired || Boolean(previous.session) || error?.startsWith('Session expired'),
        }))
      } else {
        if (!response.ok) throw new Error()
        const session: Session = await response.json()
        if (current !== revision.current) return
        setState({ session, ready: true, expired: false, unavailable: false })
      }
    } catch {
      if (current !== revision.current) return
      setState((previous) => ({ ...previous, ready: true, unavailable: true }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!state.session) return
    const timer = window.setTimeout(expire, Math.max(0, state.session.expiresAt * 1000 - Date.now()))
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [state.session, expire, refresh])

  async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (response.status === 401) throw new Error('Invalid email or password.')
    if (response.status === 429) throw new Error('Too many attempts. Try again later.')
    if (!response.ok) throw new Error('Sign-in is temporarily unavailable.')
    const session: Session = await response.json()
    revision.current += 1
    setState({ session, ready: true, expired: false, unavailable: false })
    return session.account
  }

  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (!response.ok) throw new Error('Sign-out failed. Try again.')
    revision.current += 1
    setState({ session: null, ready: true, expired: false, unavailable: false })
  }

  return <AuthContext.Provider value={{ ...state, login, logout, refresh, expire }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthProvider is required.')
  return context
}

export function useProtectedData<T>(path: string) {
  const { expire } = useAuth()
  const [result, setResult] = useState<{ data?: T; error?: string }>({})
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await request(path, controller.signal)
        if (controller.signal.aborted) return
        if (response.status === 401) {
          expire()
          return
        }
        if (!response.ok) throw new Error()
        const data: T = await response.json()
        if (!controller.signal.aborted) setResult({ data })
      } catch {
        if (!controller.signal.aborted) setResult({ error: 'Unable to load this information. Reload to try again.' })
      }
    }
    void load()
    return () => controller.abort()
  }, [path, expire])
  return result
}

// Demo routes never acquire a real session or contact protected APIs.
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const unavailable = async (): Promise<never> => { throw new Error('Authentication is unavailable in demo mode.') }
  const noop = async () => {}
  return <AuthContext.Provider value={{ session: null, ready: true, expired: false, unavailable: false, login: unavailable, logout: noop, refresh: noop, expire: () => {} }}>{children}</AuthContext.Provider>
}
