import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { MetricCard } from '../../components/ui/MetricCard'
import { Button } from '../../components/ui/Button'
import { useDevPreview } from '../../context/DevPreviewContext'

const DECISION_SECTIONS = [
  { label: 'Menu', to: '/student/decisions#menu' },
  { label: 'Staffing & Compensation', to: '/student/decisions#staffing' },
  { label: 'Finance', to: '/student/decisions#finance' },
  { label: 'Amenities & Upkeep', to: '/student/decisions#amenities' },
  { label: 'Reports', to: '/student/decisions#reports' },
] as const

/**
 * Student home page — displays current round info, team name, decision status,
 * and quick links to Decisions and Results.
 *
 * Uses DevPreview context for teamName and roundNumber (Phase 2: auth session).
 */
export function StudentHomePage() {
  const { teamName, roundNumber } = useDevPreview()

  return (
    <div className="space-y-4">
      {/* Page header */}
      <PageHeader
        title="Welcome back"
        subtitle={`${teamName} · Round ${roundNumber}`}
      />

      {/* Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard
          label="Current Round"
          value={String(roundNumber)}
          subtext="decisions due"
          ticker
        />
        <MetricCard label="Team" value={teamName} subtext="Firm #—" />
      </div>

      {/* Decision status card */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Decision Status
        </h2>
        <div className="divide-y divide-deep-green/20 dark:divide-card/10">
          {DECISION_SECTIONS.map(({ label, to }) => (
            <div
              key={label}
              className="flex items-center justify-between py-3 gap-3"
            >
              <span className="font-body text-sm text-deep-green dark:text-card flex-1">
                {label}
              </span>
              <Badge variant="draft">Draft</Badge>
              <Link
                to={to}
                className="font-body text-sm text-deep-green dark:text-card hover:underline whitespace-nowrap"
              >
                → Go to Decisions<span className="sr-only"> for {label}</span>
              </Link>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="flex flex-col items-start gap-3">
          <h3 className="font-heading text-lg font-extrabold text-deep-green dark:text-card">
            Enter Decisions
          </h3>
          <Button to="/student/decisions" variant="primary">Enter Decisions</Button>
        </Card>
        <Card className="flex flex-col items-start gap-3">
          <h3 className="font-heading text-lg font-extrabold text-deep-green dark:text-card">
            View Results
          </h3>
          <Button to="/student/results" variant="outlined">View Results</Button>
        </Card>
      </div>
    </div>
  )
}
