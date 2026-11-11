import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  clearDevPreview,
  getDevPreview,
  setDevPreview,
  type DevPreviewState,
  type DevRole,
} from '../lib/dev-preview'

interface DevPreviewContextValue extends DevPreviewState {
  /** Set the active preview role (null = exit preview). */
  setRole: (role: DevRole) => void
  /** Exit dev preview entirely. */
  exitPreview: () => void
}

const DevPreviewContext = createContext<DevPreviewContextValue | null>(null)

/** Provides dev-preview state to the entire app. */
export function DevPreviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DevPreviewState>(getDevPreview)

  // Sync state whenever another tab or the same page changes localStorage.
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'dev-preview-role') {
        setState(getDevPreview())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const setRole = useCallback((role: DevRole) => {
    setDevPreview(role)
    setState(getDevPreview())
  }, [])

  const exitPreview = useCallback(() => {
    clearDevPreview()
    setState(getDevPreview())
  }, [])

  return (
    <DevPreviewContext.Provider value={{ ...state, setRole, exitPreview }}>
      {children}
    </DevPreviewContext.Provider>
  )
}

/**
 * Returns the current dev-preview context.
 * Must be called inside a <DevPreviewProvider>.
 */
export function useDevPreview(): DevPreviewContextValue {
  const ctx = useContext(DevPreviewContext)
  if (!ctx) {
    throw new Error('useDevPreview must be used within a <DevPreviewProvider>')
  }
  return ctx
}
