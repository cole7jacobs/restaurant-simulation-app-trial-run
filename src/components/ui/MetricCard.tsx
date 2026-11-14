interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  demo?: boolean
}

/**
 * A single KPI / metric card.
 * When demo=true a small "Demo data" pill appears in the top-right corner.
 */
export function MetricCard({ label, value, subtext, demo = false }: MetricCardProps) {
  return (
    <div className="relative rounded-2xl border-l-4 border-primary bg-card p-5 shadow-sm ring-1 ring-deep-green/5 sm:p-6 dark:bg-dark-card dark:ring-card/10">
      {/* Demo data pill */}
      {demo && (
        <span className="absolute right-4 top-4 rounded-full border border-alert px-2 py-0.5 font-body text-xs text-deep-green dark:text-card">
          Demo data
        </span>
      )}

      {/* Label */}
      <p className="font-body text-sm text-deep-green/75 dark:text-card/75">{label}</p>

      {/* Value */}
      <p className="mt-1 font-heading text-3xl font-bold text-deep-green dark:text-primary">{value}</p>

      {/* Optional subtext */}
      {subtext && (
        <p className="mt-1 font-body text-xs text-deep-green/75 dark:text-card/75">{subtext}</p>
      )}
    </div>
  )
}
