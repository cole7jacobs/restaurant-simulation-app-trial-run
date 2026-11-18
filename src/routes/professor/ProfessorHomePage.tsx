import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { MetricCard } from '../../components/ui/MetricCard'

import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { DEMO_TEAMS } from './demo-teams'

const submittedTeams = DEMO_TEAMS.filter((team) => team.status === 'submitted')

/**
 * Professor home page — Milestone 1.2.
 *
 * Shows a round summary, team submission status table, and quick-action cards.
 * Phase 2: replace demo data with live round management API calls.
 */
export function ProfessorHomePage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      {/* Page header */}
      {!embedded && <PageHeader
        title="Professor Dashboard"
        subtitle={`Round ${DEV_PREVIEW_ROUND} · Fall 2026`}
      />}

      {/* Summary stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Active Round" value={String(DEV_PREVIEW_ROUND)} ticker />
        <MetricCard label="Teams" value={String(DEMO_TEAMS.length)} ticker />
        <MetricCard
          label="Submitted"
          value={String(submittedTeams.length)}
          ticker
          subtext={`${submittedTeams.length} of ${DEMO_TEAMS.length} teams`}
        />
      </div>

      {!embedded && <>
      {/* Team submissions table */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-2">
          Team Submissions — Round {DEV_PREVIEW_ROUND}
        </h2>
        <DataTable
          caption="Team submissions"
          columns={['Team', 'Firm', 'Status', 'Actions']}
          rows={DEMO_TEAMS.map((team) => ({
            key: team.name,
            cells: [
              team.name,
              team.firm,
              <Badge variant={team.status}>
                {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
              </Badge>,
              team.decisions ? (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => navigate(`/professor/team-review/${team.id}`)}
                >
                  View
                </Button>
              ) : (
                '—'
              ),
            ],
          }))}
        />
      </Card>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card mb-2">
            Generate RFI Files
          </h2>
          <p className="font-body text-sm text-deep-green/75 dark:text-card/75 mb-4">
            Export submitted team decisions as FORTRAN-compatible RFI input files for the
            simulation engine. Available after OQ-1 is resolved.
          </p>
          <Button variant="outlined" onClick={() => navigate('/professor/home#rfi')}>
            Go to RFI Generator
          </Button>
        </Card>
        <Card>
          <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card mb-2">
            Import Results
          </h2>
          <p className="font-body text-sm text-deep-green/75 dark:text-card/75 mb-4">
            Upload a FR.LST simulation output file to import round results for all teams.
            Available after OQ-2 is resolved.
          </p>
          <Button variant="outlined" onClick={() => navigate('/professor/home#import')}>
            Go to FR.LST Import
          </Button>
        </Card>
      </div>
      </>}
    </div>
  )
}
