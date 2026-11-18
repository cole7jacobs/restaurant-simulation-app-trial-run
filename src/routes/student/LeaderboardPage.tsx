import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import type { Leaderboard as LeaderboardData, LeaderboardEntry } from '../../../shared/results'

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const headingClass = 'font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4'
const noteClass = 'font-body text-sm text-slate-600 dark:text-slate-400'

const leaderboardViews = [
  { name: 'Overall', key: 'NetIncome' },
  { name: 'Revenue', key: 'Revenue' },
  { name: 'Net income', key: 'NetIncome' },
  { name: 'Operating profit', key: 'OperatingProfit' },
] as const

/** Every team's cumulative totals over imported rounds. The signed-in team's row is highlighted. */
function Leaderboard() {
  const { expire } = useAuth()
  const [teams, setTeams] = useState<LeaderboardEntry[] | null>(null)
  const [view, setView] = useState<number>(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/student/leaderboard', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) expire()
        else if (response.ok) setTeams(((await response.json()) as LeaderboardData).teams)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [expire])

  if (!teams?.length) return <p className={noteClass}>No results have been imported yet.</p>
  const { key, name } = leaderboardViews[view]
  const ranked = [...teams].sort((a, b) => b[key] - a[key])
  const measures = name === 'Overall' ? leaderboardViews.slice(1) : [leaderboardViews[view]]
  return (
    <Card>
      <h2 className={headingClass}>Leaderboard</h2>
      <p className={`${noteClass} mb-3`}>Cumulative totals across all imported rounds.</p>
      <div role="group" aria-label="Leaderboard view" className="flex items-center gap-2 flex-wrap mb-3">
        {leaderboardViews.map(({ name: label }, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={index === view}
            onClick={() => setView(index)}
            className={[
              'inline-flex items-center justify-center rounded-sm px-3 py-1 font-body text-sm font-medium transition-colors',
              index === view
                ? 'bg-deep-green text-card dark:bg-card dark:text-deep-green'
                : 'border border-deep-green/30 dark:border-card/30 text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-body text-sm">
          <caption className="sr-only">{name} leaderboard</caption>
          <thead>
            <tr className="border-b border-deep-green/20 dark:border-card/10">
              <th scope="col" className="pb-2 pr-4 text-left font-medium">Rank</th>
              <th scope="col" className="pb-2 pr-4 text-left font-medium">Team</th>
              {measures.map(({ name: label }) => (
                <th key={label} scope="col" className="pb-2 pl-4 text-right font-medium">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-deep-green/10 dark:divide-card/5">
            {ranked.map((team, index) => (
              <tr
                key={team.TeamName}
                aria-current={team.IsOwn ? 'true' : undefined}
                className={team.IsOwn ? 'bg-primary/15 font-semibold' : undefined}
              >
                <td className="py-2 pr-4 tabular-nums">{index + 1}</td>
                <th scope="row" className="py-2 pr-4 text-left font-normal">
                  {team.FirmNumber === null ? '' : `${team.FirmNumber}. `}{team.TeamName}{team.IsOwn ? ' (you)' : ''}
                </th>
                {measures.map(({ key: measure, name: label }) => (
                  <td key={label} className="py-2 pl-4 text-right tabular-nums">{dollars.format(team[measure])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** Student leaderboard tab. Demo and preview modes show a note instead of data. */
export function LeaderboardPage({ demo = false }: { demo?: boolean }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Leaderboard" subtitle="Team standings from imported results" />
      {demo
        ? <p className={noteClass}>The leaderboard is available when you are signed in.</p>
        : <Leaderboard />}
    </div>
  )
}
