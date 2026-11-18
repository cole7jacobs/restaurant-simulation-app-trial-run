import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { MetricCard } from '../../components/ui/MetricCard'
import { Button } from '../../components/ui/Button'
import { useDevPreview } from '../../context/DevPreviewContext'
import { DecisionSectionTiles } from './DecisionSectionTiles'

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

      <DecisionSectionTiles />

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
