import { Card } from '../../components/ui/Card'
import { DataTable } from '../../components/ui/DataTable'
import { MetricCard } from '../../components/ui/MetricCard'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { useDevPreview } from '../../context/DevPreviewContext'

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const OPERATING_SUMMARY = [
  { label: 'Food Sales', value: '$24,850' },
  { label: 'Food Cost', value: '$12,400' },
  { label: 'Beverage Sales', value: '$8,320' },
  { label: 'Beverage Cost', value: '$3,100' },
  { label: 'Operating Profit', value: '$4,220' },
  { label: 'Net Income', value: '$3,145' },
] as const

const MENU_PERFORMANCE = [
  { item: 'Steak', orders: 42, sales: '$1,176', cogs: '48%', price: '$28' },
  { item: 'Chicken', orders: 68, sales: '$1,224', cogs: '35%', price: '$18' },
  { item: 'Wine', orders: 55, sales: '$660', cogs: '22%', price: '$12' },
  { item: 'Beer', orders: 89, sales: '$623', cogs: '28%', price: '$7' },
] as const

const ACTIVE_ROUND = 3
const ROUNDS = [1, 2, 3, 4, 5] as const

// ---------------------------------------------------------------------------
// ResultsPage
// ---------------------------------------------------------------------------

/**
 * Results dashboard — all data is placeholder/demo.
 * Charts are placeholder divs (Recharts integration in Phase 6).
 * Real results displayed after FR.LST import in Phase 5-6.
 */
export function ResultsPage() {
  const { teamName, roundNumber } = useDevPreview()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Results"
        subtitle={`Round ${roundNumber} · ${teamName}`}
      />

      {/* Round selector */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {ROUNDS.map((r) => (
            <button
              key={r}
              type="button"
              className={[
                'inline-flex items-center justify-center rounded-sm px-4 py-1.5 font-body text-sm font-medium transition-colors',
                r === ACTIVE_ROUND
                  ? 'bg-deep-green text-card dark:bg-card dark:text-deep-green'
                  : 'border border-deep-green/30 dark:border-card/30 text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10',
              ].join(' ')}
            >
              Round {r}
            </button>
          ))}
        </div>
        <p className="font-body text-xs text-deep-green/75 dark:text-card/75">
          Round selector will be functional in Phase 6.
        </p>
      </div>

      {/* Demo data alert */}
      <Notice>
        These are demonstration values only. Real results will be displayed after FR.LST import in
        Phase 5-6.
      </Notice>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Food Sales" value="$24,850" demo ticker />
        <MetricCard label="Beverage Sales" value="$8,320" demo ticker />
        <MetricCard label="Net Income" value="$3,145" demo ticker />
        <MetricCard label="Avg Daily Customers" value="68" demo ticker />
      </div>

      {/* Operating summary */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Operating Summary
        </h2>
        <table className="w-full font-body text-sm">
          <tbody className="divide-y divide-deep-green/20 dark:divide-card/10">
            {OPERATING_SUMMARY.map(({ label, value }) => (
              <tr key={label}>
                <td className="py-2 text-deep-green dark:text-card">{label}</td>
                <td className="py-2 text-right font-medium text-deep-green dark:text-card">
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Menu performance */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Menu Performance
        </h2>
        <DataTable
          caption="Menu performance"
          columns={['Item', 'Orders', 'Sales', 'COGS%', 'Price']}
          rows={MENU_PERFORMANCE.map(({ item, orders, sales, cogs, price }) => ({
            key: item,
            cells: [item, orders, sales, cogs, price],
          }))}
        />
        <p className="mt-3 font-body text-xs text-deep-green/75 dark:text-card/75">
          Actual values after FR.LST import (Phase 5).
        </p>
      </Card>

      {/* Chart placeholder cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card mb-3">
            Sales Breakdown
          </h2>
          <div className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-deep-green/20 dark:border-card/20 text-deep-green/75 dark:text-card/75 font-body text-sm">
            Recharts donut chart · Phase 6
          </div>
        </Card>
        <Card>
          <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card mb-3">
            Net Income by Round
          </h2>
          <div className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-deep-green/20 dark:border-card/20 text-deep-green/75 dark:text-card/75 font-body text-sm">
            Recharts bar chart · Phase 6
          </div>
        </Card>
      </div>
    </div>
  )
}
