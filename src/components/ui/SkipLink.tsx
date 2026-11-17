/** First tab stop on every page: lets keyboard users jump past the navigation. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-deep-green focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:font-medium focus:text-card dark:focus:bg-card dark:focus:text-deep-green"
    >
      Skip to main content
    </a>
  )
}
