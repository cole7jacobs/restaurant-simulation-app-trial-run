import { TickerNumber } from './TickerNumber'

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  demo?: boolean
  /** Roll the digits into place when the page loads (odometer style). */
  ticker?: boolean
}

/**
 * A single KPI / metric card.
 * When demo=true a small "Demo data" pill appears in the top-right corner.
 */
export function MetricCard({ label, value, subtext, demo = false, ticker = false }: MetricCardProps) {
  return (
    <div className="relative rounded-sm border border-primary border-t-4 border-t-primary bg-beige p-4 dark:bg-dark-card dark:border-card/10 dark:border-t-primary">
      {/* Demo data pill */}
      {demo && (
        <span className="mb-1 inline-block font-body text-[10px] font-medium uppercase tracking-[0.15em] text-deep-green/60 dark:text-card/60">
          Demo data
        </span>
      )}

      {/* Label */}
      <p className="font-body text-xs font-medium uppercase tracking-[0.12em] text-deep-green/75 dark:text-card/75">{label}</p>

      {/* Value */}
      <p className="mt-1 font-heading text-4xl font-extrabold leading-none tabular-nums text-deep-green dark:text-card">{ticker ? <TickerNumber value={value} /> : value}</p>

      {/* Optional subtext */}
      {subtext && (
        <p className="mt-1 font-body text-xs text-deep-green/75 dark:text-card/75">{subtext}</p>
      )}
    </div>
  )
}
