import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { MetricCard } from '../../components/ui/MetricCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { menuPreparations } from '../../../shared/decisions'
import { importRounds, type StudentResults, type TeamResults } from '../../../shared/results'

// Every figure on this page is shown as imported from FR.LST; nothing is recalculated.
const financialRows: { key: keyof TeamResults; label: string }[] = [
  { key: 'FoodSales', label: 'Food sales' },
  { key: 'FoodCost', label: 'Food cost' },
  { key: 'BeverageSales', label: 'Beverage sales' },
  { key: 'BeverageCost', label: 'Beverage cost' },
  { key: 'OperatingProfit', label: 'Operating profit' },
  { key: 'NetIncome', label: 'Net income' },
]

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const count = new Intl.NumberFormat('en-US')
const headingClass = 'font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4'
const noteClass = 'font-body text-sm text-slate-600 dark:text-slate-400'

type Loaded = Map<number, StudentResults>
type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; rounds: Loaded }

/** Loads Q1–Q7 for the signed-in team. A 404 means that round has not been imported. */
function useAllRounds() {
  const { expire } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    async function load() {
      try {
        const responses = await Promise.all(importRounds.map((round) =>
          fetch(`/api/student/results/${round}`, { signal: controller.signal, cache: 'no-store' })))
        if (controller.signal.aborted) return
        if (responses.some(({ status }) => status === 401)) {
          expire()
          return
        }
        const rounds: Loaded = new Map()
        for (const [index, response] of responses.entries()) {
          if (response.status === 404) continue
          if (!response.ok) throw new Error()
          rounds.set(importRounds[index], await response.json() as StudentResults)
        }
        if (!controller.signal.aborted) setState({ status: 'ready', rounds })
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' })
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, expire])

  return { state, retry: () => setAttempt((value) => value + 1) }
}

type Bar = { label: string; value: number; display: string }

/**
 * Horizontal bars for one measure, each labelled with its imported value.
 * Bars grow from a shared zero line so losses extend to the left.
 */
function BarList({ label, bars }: { label: string; bars: Bar[] }) {
  const low = Math.min(0, ...bars.map(({ value }) => value))
  const high = Math.max(0, ...bars.map(({ value }) => value))
  const range = high - low || 1
  return (
    <ul aria-label={label} className="space-y-3 font-body text-sm">
      {bars.map(({ label: name, value, display }, index) => (
        <li key={`${index}:${name}`} title={`${name}: ${display}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-deep-green dark:text-card">{name}</span>
            <span className="font-medium tabular-nums text-deep-green dark:text-card">{display}</span>
          </div>
          <div className="relative mt-1 h-3" aria-hidden="true">
            <div
              className="absolute inset-y-0 w-px bg-deep-green/30 dark:bg-card/30"
              style={{ left: `${(-low / range) * 100}%` }}
            />
            <div
              className={`absolute inset-y-0 bg-primary ${value < 0 ? 'rounded-l' : 'rounded-r'}`}
              style={{
                left: `${((Math.min(value, 0) - low) / range) * 100}%`,
                width: `${(Math.abs(value) / range) * 100}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function preparation(itemName: string, prepLevel: number) {
  return (Object.prototype.hasOwnProperty.call(menuPreparations, itemName)
    ? menuPreparations[itemName][prepLevel - 1] : undefined) ?? `Level ${prepLevel}`
}

function RoundResults({ results }: { results: StudentResults }) {
  const { metrics, menu, round } = results
  const menuBars = menu.map((row) => ({ row, label: `${row.ItemName} · ${preparation(row.ItemName, row.PrepLevel)}` }))

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Net Income" value={dollars.format(metrics.NetIncome)} ticker />
        <MetricCard label="Operating Profit" value={dollars.format(metrics.OperatingProfit)} ticker />
        <MetricCard label="Food Orders" value={count.format(metrics.FoodOrders)} ticker />
        <MetricCard label="Avg Daily Customers" value={count.format(metrics.AvgDailyCustomerCount)} ticker />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <h2 className={headingClass}>Operating Summary</h2>
          <table className="w-full font-body text-sm">
            <caption className="sr-only">Q{round} income statement amounts</caption>
            <tbody className="divide-y divide-deep-green/10 dark:divide-card/10">
              {financialRows.map(({ key, label }) => (
                <tr key={key}>
                  <th scope="row" className="py-2 text-left font-normal">{label}</th>
                  <td className="py-2 text-right font-medium tabular-nums">{dollars.format(metrics[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2 className={headingClass}>Sales and Cost of Sales</h2>
          <BarList
            label={`Q${round} sales and cost of sales`}
            bars={financialRows.slice(0, 4).map(({ key, label }) => (
              { label, value: metrics[key], display: dollars.format(metrics[key]) }
            ))}
          />
        </Card>
      </div>

      <Card>
        <h2 className={headingClass}>Menu Performance</h2>
        {menu.length === 0 ? (
          <p className={noteClass}>Menu-item results are not available for this round.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <caption className="sr-only">Q{round} menu-item results</caption>
                <thead>
                  <tr className="border-b border-deep-green/10 dark:border-card/10">
                    <th scope="col" className="pb-2 pr-4 text-left font-medium">Item</th>
                    <th scope="col" className="pb-2 pr-4 text-left font-medium">Preparation</th>
                    <th scope="col" className="pb-2 pr-4 text-right font-medium">Orders sold</th>
                    <th scope="col" className="pb-2 pr-4 text-right font-medium">Total sales</th>
                    <th scope="col" className="pb-2 text-right font-medium">Cost of goods sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-deep-green/5 dark:divide-card/5">
                  {menu.map((row) => (
                    <tr key={row.ResultSlot}>
                      <th scope="row" className="py-2 pr-4 text-left font-normal">{row.ItemName}</th>
                      <td className="py-2 pr-4">{preparation(row.ItemName, row.PrepLevel)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{count.format(row.OrdersSold)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{dollars.format(row.TotalSales)}</td>
                      <td className="py-2 text-right tabular-nums">{row.CostOfGoodsSoldPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-heading text-lg font-extrabold mb-3">Orders Sold by Item</h3>
                <BarList
                  label={`Q${round} orders sold by menu item`}
                  bars={menuBars.map(({ row, label }) => (
                    { label, value: row.OrdersSold, display: count.format(row.OrdersSold) }
                  ))}
                />
              </div>
              <div>
                <h3 className="font-heading text-lg font-extrabold mb-3">Total Sales by Item</h3>
                <BarList
                  label={`Q${round} total sales by menu item`}
                  bars={menuBars.map(({ row, label }) => (
                    { label, value: row.TotalSales, display: dollars.format(row.TotalSales) }
                  ))}
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}

function Trends({ rounds }: { rounds: Loaded }) {
  const imported = [...rounds.values()].sort((a, b) => a.round - b.round)
  const trend = (key: 'NetIncome' | 'OperatingProfit') => imported.map(({ round, metrics }) => (
    { label: `Q${round}`, value: metrics[key], display: dollars.format(metrics[key]) }
  ))
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card>
        <h2 className={headingClass}>Net Income by Round</h2>
        <BarList label="Net income by round" bars={trend('NetIncome')} />
      </Card>
      <Card>
        <h2 className={headingClass}>Operating Profit by Round</h2>
        <BarList label="Operating profit by round" bars={trend('OperatingProfit')} />
      </Card>
    </div>
  )
}

/** Authenticated results dashboard for the signed-in student's assigned team. */
export function StudentResultsDashboard() {
  const { session } = useAuth()
  const { state, retry } = useAllRounds()
  const [selected, setSelected] = useState<number | null>(null)
  const rounds = state.status === 'ready' ? state.rounds : null
  // Default to the most recent round that has imported results.
  const round = selected ?? (rounds?.size ? Math.max(...rounds.keys()) : null)
  const results = round === null ? undefined : rounds?.get(round)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Results"
        subtitle={[round === null ? null : `Q${round}`, session?.account.teamName].filter(Boolean).join(' · ')}
      />

      {state.status === 'loading' && <Card><p role="status">Loading results…</p></Card>}

      {state.status === 'error' && (
        <Card>
          <div className="space-y-4">
            <p role="alert">Unable to load your results.</p>
            <Button variant="outlined" size="sm" onClick={retry}>Try again</Button>
          </div>
        </Card>
      )}

      {rounds && rounds.size === 0 && (
        <Card>
          <EmptyState
            title="No results yet"
            description="Results appear here after your professor imports the simulation output for a round."
          />
        </Card>
      )}

      {rounds && rounds.size > 0 && round !== null && (
        <>
          <div role="group" aria-label="Simulation round" className="flex items-center gap-2 flex-wrap">
            {importRounds.map((value) => {
              const available = rounds.has(value)
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={value === round}
                  aria-label={available ? `Q${value}` : `Q${value}, no results`}
                  onClick={() => setSelected(value)}
                  className={[
                    'inline-flex items-center justify-center rounded-sm px-4 py-1.5 font-body text-sm font-medium transition-colors',
                    value === round
                      ? 'bg-deep-green text-white dark:bg-primary dark:text-deep-green'
                      : 'border border-deep-green/30 dark:border-card/30 text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10',
                    available || value === round ? '' : 'opacity-60',
                  ].join(' ')}
                >
                  Q{value}
                </button>
              )
            })}
          </div>

          {results ? <RoundResults results={results} /> : (
            <Card>
              <EmptyState
                title={`No results for Q${round}`}
                description="Results for this round have not been imported yet."
              />
            </Card>
          )}

          {rounds.size > 1 && <Trends rounds={rounds} />}
        </>
      )}
    </div>
  )
}
