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
    <div className="relative rounded-2xl bg-card p-6 shadow-sm dark:bg-dark-card">
      {/* Demo data pill */}
      {demo && (
        <span className="absolute right-4 top-4 rounded-full border border-amber-400 px-2 py-0.5 font-body text-xs text-amber-600 dark:text-amber-400">
          Demo data
        </span>
      )}

      {/* Label */}
      <p className="font-body text-sm text-slate-600 dark:text-slate-400">{label}</p>

      {/* Value */}
      <p className="mt-1 font-heading text-3xl font-bold text-primary">{value}</p>

      {/* Optional subtext */}
      {subtext && (
        <p className="mt-1 font-body text-xs text-slate-500 dark:text-slate-500">{subtext}</p>
      )}
    </div>
  )
}
