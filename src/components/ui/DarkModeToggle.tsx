import { useDarkMode } from '../../hooks/useDarkMode'

/**
 * Dark mode toggle button — renders a moon icon (dark mode off) or sun icon (dark mode on).
 * Matches the circular button shown in the top-right corner of the design mockups.
 *
 * Usage: drop into any layout's top navigation bar.
 */
export function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode()

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        flex h-11 w-11 items-center justify-center rounded-full
        border border-deep-green text-deep-green
        hover:bg-deep-green/10
        dark:border-card dark:text-card dark:hover:bg-card/10
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-primary focus-visible:ring-offset-2
      "
    >
      {isDark ? (
        /* Sun icon — shown when currently in dark mode (click to go light) */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        /* Moon icon — shown when currently in light mode (click to go dark) */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
