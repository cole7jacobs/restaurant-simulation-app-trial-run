interface SectionNavItem {
  id: string
  label: string
  complete: boolean
  count?: string
}

interface SectionNavProps {
  items: SectionNavItem[]
  activeId: string
  onSelect: (id: string) => void
}

/**
 * Left-sidebar section navigator for multi-section decision flows.
 * Active item is highlighted in deep-green (light) / primary (dark).
 * Completed items show a green checkmark; incomplete items show a gray circle.
 */
export function SectionNav({ items, activeId, onSelect }: SectionNavProps) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Decision sections">
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? 'step' : undefined}
            className={[
              'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-deep-green text-card dark:bg-card dark:text-deep-green'
                : 'text-deep-green hover:bg-deep-green/5 dark:text-card dark:hover:bg-dark-card',
            ].join(' ')}
          >
            {/* Status indicator */}
            <span className="shrink-0 text-base leading-none" aria-hidden="true">
              {item.complete ? (
                <span className={isActive ? 'text-primary dark:text-deep-green' : 'text-deep-green dark:text-card'}>✓</span>
              ) : (
                <span
                  className={[
                    'inline-block h-4 w-4 rounded-full border-2',
                    isActive
                      ? 'border-white/70 dark:border-deep-green/70'
                      : 'border-deep-green/40 dark:border-card/40',
                  ].join(' ')}
                />
              )}
            </span>
            <span className="sr-only">{item.complete ? 'Complete: ' : 'Not complete: '}</span>

            {/* Label */}
            <span className="flex-1 font-body">{item.label}</span>

            {/* Optional count */}
            {item.count && (
              <span
                className={[
                  'shrink-0 font-body text-xs',
                  isActive
                    ? 'text-card/70 dark:text-deep-green/70'
                    : 'text-deep-green/75 dark:text-card/75',
                ].join(' ')}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
