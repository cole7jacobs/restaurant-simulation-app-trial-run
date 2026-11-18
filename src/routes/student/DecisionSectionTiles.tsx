import { Link } from 'react-router-dom'

const sections = [
  { id: 'menu', label: 'Menu selections', detail: 'Items, preparations, portions and prices' },
  { id: 'staffing', label: 'Staffing & Compensation', detail: 'Staffing and hourly compensation' },
  { id: 'finance', label: 'Finance', detail: 'Deposits and note payable changes' },
  { id: 'amenities', label: 'Amenities & Upkeep', detail: 'Amenities, entertainment and maintenance' },
  { id: 'reports', label: 'Reports', detail: 'Management report choices' },
] as const

export function DecisionSectionTiles({ prefix = '' }: { prefix?: string }) {
  return (
    <section aria-labelledby="decision-sections-title" className="space-y-3">
      <div>
        <h2 id="decision-sections-title" className="font-heading text-xl font-extrabold">Decision sections</h2>
        <p className="text-sm text-deep-green/75 dark:text-card/75">Choose a tile to edit that section.</p>
      </div>
      <nav aria-label="Decision sections" className="decision-shortcut-grid">
        {sections.map(({ id, label, detail }, index) => (
          <Link key={id} to={prefix + '/student/decisions#' + id} aria-label={label}
            className="decision-shortcut tile-entrance">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold text-deep-green/65 dark:text-card/65" aria-hidden="true">
              <span>{String(index + 1).padStart(2, '0')}</span><span>↗</span>
            </span>
            <span className="font-heading text-lg font-extrabold uppercase tracking-wide">{label}</span>
            <span className="text-sm text-deep-green/75 dark:text-card/75" aria-hidden="true">{detail}</span>
          </Link>
        ))}
      </nav>
    </section>
  )
}
