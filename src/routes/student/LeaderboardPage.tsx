import { useEffect, useId, useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { demoLeaderboardRows } from '../../lib/demo-leaderboard'
import type { Leaderboard as LeaderboardData, LeaderboardEntry } from '../../../shared/results'

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
const headingClass = 'font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4'
const noteClass = 'font-body text-sm text-slate-600 dark:text-slate-400'

const quarters = [1, 2, 3, 4, 5, 6, 7]
const leaderboardViews = [
  { name: 'Overall', key: 'NetIncome' },
  { name: 'Revenue', key: 'Revenue' },
  { name: 'Net income', key: 'NetIncome' },
  { name: 'Operating profit', key: 'OperatingProfit' },
] as const
type Measure = typeof leaderboardViews[number]['key']

/** "Q1 to Q6 included" when the quarters are consecutive, otherwise "Q1, Q2 and Q4 included". */
const includedLabel = (rounds: number[]) => {
  const list = [...new Set(rounds)].sort((a, b) => a - b).map((round) => `Q${round}`)
  const consecutive = rounds.length > 1 && [...new Set(rounds)].sort((a, b) => a - b).every((round, i, all) => i === 0 || round === all[i - 1] + 1)
  if (list.length === 1) return `${list[0]} included`
  return consecutive ? `${list[0]} to ${list[list.length - 1]} included` : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]} included`
}

const otherColors = ['#2563eb', '#d97706', '#7c3aed', '#0d9488', '#db2777', '#65a30d']
const teamLabel = (team: Pick<LeaderboardEntry, 'FirmNumber' | 'TeamName' | 'IsOwn'>) =>
  `${team.FirmNumber === null ? '' : `${team.FirmNumber}. `}${team.TeamName}${team.IsOwn ? ' (you)' : ''}`

/** Cumulative line chart: one line per team, x = quarter, y = running total of the chosen measure. */
function Chart({ rows, measure, title }: { rows: LeaderboardEntry[]; measure: Measure; title: string }) {
  const id = useId()
  const rounds = [...new Set(rows.map((row) => row.RoundNumber))].sort((a, b) => a - b)
  const teams = [...new Map(rows.map((row) => [row.TeamName, row])).values()]
    .sort((a, b) => (a.FirmNumber ?? 99) - (b.FirmNumber ?? 99) || a.TeamName.localeCompare(b.TeamName))
  const series = teams.map((team) => {
    let total = 0
    return rounds.map((round) => {
      total += rows.filter((row) => row.TeamName === team.TeamName && row.RoundNumber === round)
        .reduce((sum, row) => sum + row[measure], 0)
      return total
    })
  })
  const width = 720, height = 340, left = 76, right = 170, top = 16, bottom = 36
  const all = series.flat()
  const min = Math.min(0, ...all), max = Math.max(0, ...all)
  const x = (index: number) => left + (rounds.length === 1 ? 0.5 : index / (rounds.length - 1)) * (width - left - right)
  const y = (value: number) => top + ((max - value) / (max - min || 1)) * (height - top - bottom)
  const ticks = [0, 1, 2, 3].map((step) => min + ((max - min) * step) / 3)

  // End-of-line labels, pushed apart so they do not overlap.
  const labelY: number[] = []
  const order = series.map((values, index) => ({ index, at: y(values[values.length - 1]) })).sort((a, b) => a.at - b.at)
  order.forEach(({ index, at }, position) => {
    labelY[index] = position === 0 ? at : Math.max(at, labelY[order[position - 1].index] + 14)
  })

  const description = teams.map((team, index) =>
    `${teamLabel(team)}: ${rounds.map((round, i) => `${dollars.format(series[index][i])} after Q${round}`).join(', ')}`).join('. ')
  let other = 0
  return (
    <figure className="mt-6">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-t ${id}-d`} className="w-full h-auto font-body text-deep-green dark:text-card">
        <title id={`${id}-t`}>{title}</title>
        <desc id={`${id}-d`}>{description}</desc>
        {ticks.map((tick) => (
          <g key={tick} aria-hidden="true">
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="currentColor" strokeOpacity="0.15" />
            <text x={left - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="currentColor">{compact.format(tick)}</text>
          </g>
        ))}
        {rounds.map((round, index) => (
          <text key={round} x={x(index)} y={height - 12} textAnchor="middle" fontSize="12" fill="currentColor" aria-hidden="true">Q{round}</text>
        ))}
        {teams.map((team, index) => {
          const color = team.IsOwn ? 'currentColor' : otherColors[other++ % otherColors.length]
          const points = series[index].map((value, i) => `${x(i)},${y(value)}`).join(' ')
          return (
            <g key={team.TeamName} aria-hidden="true">
              <polyline points={points} fill="none" stroke={color} strokeWidth={team.IsOwn ? 4 : 2} strokeLinejoin="round" />
              {series[index].map((value, i) => <circle key={i} cx={x(i)} cy={y(value)} r={team.IsOwn ? 4 : 3} fill={color} />)}
              <text x={width - right + 8} y={labelY[index] + 4} fontSize="12" fontWeight={team.IsOwn ? 700 : 400} fill={color}>{teamLabel(team)}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className={`${noteClass} mt-1`}>{title}</figcaption>
    </figure>
  )
}

/** Quarter buttons, view buttons, ranked table and (for game to date) the cumulative chart. */
function LeaderboardView({ rows, sample }: { rows: LeaderboardEntry[]; sample: boolean }) {
  const [period, setPeriod] = useState(0)
  const [view, setView] = useState<number>(0)
  const imported = new Set(rows.map((row) => row.RoundNumber))
  const { key, name } = leaderboardViews[view]
  const scoped = period === 0 ? rows : rows.filter((row) => row.RoundNumber === period)

  const totals = new Map<string, LeaderboardEntry>()
  for (const row of scoped) {
    const have = totals.get(row.TeamName)
    totals.set(row.TeamName, have
      ? { ...have, NetIncome: have.NetIncome + row.NetIncome, Revenue: have.Revenue + row.Revenue, OperatingProfit: have.OperatingProfit + row.OperatingProfit }
      : { ...row })
  }
  const ranked = [...totals.values()].sort((a, b) => b[key] - a[key] || a.TeamName.localeCompare(b.TeamName))
  const measures = name === 'Overall' ? leaderboardViews.slice(1) : [leaderboardViews[view]]
  const buttonClass = (active: boolean, dashed = false) => [
    'inline-flex items-center justify-center rounded-sm px-3 py-1 font-body text-sm font-medium transition-colors',
    active
      ? 'bg-deep-green text-card dark:bg-card dark:text-deep-green'
      : `border ${dashed ? 'border-dashed' : ''} border-deep-green/30 dark:border-card/30 text-deep-green dark:text-card hover:bg-deep-green/5 dark:hover:bg-card/10`,
  ].join(' ')
  const periodName = period === 0 ? 'Game to date' : `Q${period}`

  return (
    <Card>
      <h2 className={headingClass}>Leaderboard</h2>
      <p className={`${noteClass} mb-3`}>
        {sample ? 'Sample data. ' : ''}{period === 0 ? `Game to date: ${includedLabel([...imported])}.` : `${periodName} results only.`}
      </p>
      <div role="group" aria-label="Quarter" className="flex items-center gap-2 flex-wrap mb-3">
        {[0, ...quarters].map((value) => (
          <button key={value} type="button" aria-pressed={value === period} onClick={() => setPeriod(value)}
            className={buttonClass(value === period, value !== 0 && !imported.has(value))}>
            {value === 0 ? 'Game to date' : `Q${value}`}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Leaderboard view" className="flex items-center gap-2 flex-wrap mb-3">
        {leaderboardViews.map(({ name: label }, index) => (
          <button key={label} type="button" aria-pressed={index === view} onClick={() => setView(index)} className={buttonClass(index === view)}>
            {label}
          </button>
        ))}
      </div>
      {!ranked.length ? <p className={noteClass}>No results for {periodName} yet.</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <caption className="sr-only">{period === 0 ? '' : `${periodName} `}{name} leaderboard</caption>
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
                  <tr key={team.TeamName} aria-current={team.IsOwn ? 'true' : undefined}
                    className={team.IsOwn ? 'bg-primary/15 font-semibold' : undefined}>
                    <td className="py-2 pr-4 tabular-nums">{index + 1}</td>
                    <th scope="row" className="py-2 pr-4 text-left font-normal">{teamLabel(team)}</th>
                    {measures.map(({ key: measure, name: label }) => (
                      <td key={label} className="py-2 pl-4 text-right tabular-nums">{dollars.format(team[measure])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {period === 0 && <Chart rows={rows} measure={key} title={`Cumulative ${name === 'Overall' ? 'net income' : name.toLowerCase()} by quarter (${includedLabel([...imported])})`} />}
        </>
      )}
    </Card>
  )
}

/** Fetches the per-round rows for a signed-in student, or uses the given demo rows without any request. */
function Leaderboard({ sample }: { sample?: LeaderboardEntry[] }) {
  const { expire } = useAuth()
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(sample ?? null)

  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (sample) return
    const controller = new AbortController()
    fetch('/api/student/leaderboard', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) expire()
        else if (response.ok) setRows(((await response.json()) as LeaderboardData).rows)
        else setFailed(true)
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [expire, sample])

  if (failed) return <p className={noteClass}>Could not load the leaderboard.</p>
  if (rows === null) return <p className={noteClass}>Loading leaderboard...</p>
  if (!rows.length) return <p className={noteClass}>No results have been imported yet.</p>
  return <LeaderboardView rows={rows} sample={Boolean(sample)} />
}

/** Student leaderboard tab. Demo and preview modes show sample data (Q1 to Q6, plus Q7 after the demo import). */
export function LeaderboardPage({ demo = false }: { demo?: boolean }) {
  const sample = useMemo(() => (demo ? demoLeaderboardRows() : undefined), [demo])
  return (
    <div className="space-y-6">
      <PageHeader title="Leaderboard" subtitle="Team standings from imported results" />
      <Leaderboard sample={sample} />
    </div>
  )
}
