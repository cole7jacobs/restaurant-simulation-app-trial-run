import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { importRounds } from '../../../shared/results'

type Row = { teamId: number; teamName: string; firmNumber: number; netIncome: number; operatingProfit: number; foodSales: number; beverageSales: number }
type Metric = 'netIncome' | 'revenue' | 'operatingProfit'
type State = ({ status: 'loading' } | { status: 'unavailable' } | { status: 'error' } | { status: 'ready'; teams: Row[] }) & { round: number }
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function LeaderboardPage({ role }: { role: 'student' | 'professor' }) {
  const { session, expire } = useAuth()
  const [round, setRound] = useState(1)
  const [metric, setMetric] = useState<Metric>('netIncome')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<State>({ status: 'loading', round: 1 })

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', round })
    async function load() {
      try {
        const response = await fetch(`/api/${role}/leaderboard/${round}`, { signal: controller.signal, cache: 'no-store' })
        if (controller.signal.aborted) return
        if (response.status === 401) { expire(); return }
        if (response.status === 404) { setState({ status: 'unavailable', round }); return }
        if (!response.ok) throw new Error()
        const data: { teams: Row[] } = await response.json()
        if (!controller.signal.aborted) setState({ status: 'ready', round, teams: data.teams })
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error', round })
      }
    }
    void load()
    return () => controller.abort()
  }, [role, round, attempt, expire])

  const visible: State = state.round === round ? state : { status: 'loading', round }
  const value = (row: Row) => metric === 'revenue' ? row.foodSales + row.beverageSales : row[metric]
  const sorted = visible.status === 'ready' ? [...visible.teams].sort((a, b) => value(b) - value(a) || a.firmNumber - b.firmNumber || a.teamId - b.teamId) : []
  const ordinal = (rank: number) => `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'}`
  return <div className="space-y-4">
    <PageHeader title="Team Leaderboard" />
    <Card><div className="flex flex-wrap items-end gap-4">
      <label className="grid gap-1 text-sm font-medium">Simulation quarter
        <select className="min-h-11 rounded border border-deep-green/30 bg-card/50 px-3 py-2 dark:bg-dark-card" value={round} onChange={(event) => setRound(Number(event.target.value))}>
          {importRounds.map((period) => <option key={period} value={period}>Quarter {period}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Ranking metric
        <select className="min-h-11 rounded border border-deep-green/30 bg-card/50 px-3 py-2 dark:bg-dark-card" value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
          <option value="netIncome">Net Income</option><option value="revenue">Total Sales / Revenue</option><option value="operatingProfit">Operating Profit</option>
        </select>
      </label>
    </div></Card>
    {visible.status === 'loading' && <Card><p role="status">Loading leaderboard…</p></Card>}
    {visible.status === 'unavailable' && <Card><EmptyState title="Results not available" description={`Results for Quarter ${round} have not been released yet.`} /></Card>}
    {visible.status === 'error' && <Card><p role="alert">Unable to load the leaderboard.</p><Button className="mt-3" variant="outlined" onClick={() => setAttempt((n) => n + 1)}>Try again</Button></Card>}
    {visible.status === 'ready' && <Card>{metric === 'revenue' && <p className="mb-3 text-sm">Revenue is food sales plus beverage sales; printed totals may differ slightly due to rounding.</p>}<div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">Quarter {round} team leaderboard</caption>
      <thead><tr className="border-b border-deep-green/20 dark:border-card/10"><th scope="col" className="p-3">Rank</th><th scope="col" className="p-3">Restaurant / Team</th><th scope="col" className="p-3 text-right">Financial Performance</th></tr></thead>
      <tbody className="divide-y divide-deep-green/10 dark:divide-card/10">{sorted.map((row, index) => {
        const own = role === 'student' && row.teamId === session?.account.teamId
        return <tr key={row.teamId} className={own ? 'bg-primary/20 font-semibold' : ''}>
          <td className="p-3">{ordinal(index + 1)}</td><th scope="row" className="p-3 text-left">{row.teamName}{own ? ' (You)' : ''}</th><td className="p-3 text-right tabular-nums">{money.format(value(row))}</td>
        </tr>
      })}</tbody>
    </table></div></Card>}
  </div>
}
