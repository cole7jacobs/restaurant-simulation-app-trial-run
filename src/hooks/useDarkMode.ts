import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

/**
 * Manages the application's dark mode state.
 *
 * - Reads the initial preference from localStorage (key: "theme").
 * - Adds or removes the `dark` class on <html> whenever the preference changes.
 * - Persists the preference back to localStorage on each change.
 *
 * The <html> class is also set by the synchronous inline script in index.html
 * before React loads, preventing a flash of the wrong theme on first paint.
 */
export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('theme') as Theme | null) ?? 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // localStorage unavailable in some environments; fail silently
    }
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, isDark: theme === 'dark', toggle }
}
