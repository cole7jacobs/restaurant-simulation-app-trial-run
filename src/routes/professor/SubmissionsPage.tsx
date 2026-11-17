import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { DEMO_TEAMS } from './demo-teams'
import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'

/**
 * Submission monitoring page — Milestone 1.2.
 *
 * Shows submission status for all teams in the current round.
 * Phase 2: replace demo data with live database queries.
 */
export function SubmissionsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      {/* Page header */}
      <PageHeader title="Team Submissions" subtitle={`Round ${DEV_PREVIEW_ROUND}`} />

      {/* Submissions table */}
      <Card>
        <DataTable
          caption="Team submissions"
          columns={['Team', 'Firm', 'Submitted At', 'Decision Count', 'Actions']}
          rows={DEMO_TEAMS.map((team) => ({
            key: team.name,
            cells: [
              team.name,
              team.firm,
              team.submittedAt ?? '—',
              team.decisionCount,
              team.decisions ? (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => navigate(`/professor/team-review/${team.id}`)}
                >
                  View Decisions
                </Button>
              ) : (
                '—'
              ),
            ],
          }))}
        />
      </Card>

      {/* Export action */}
      <div>
        <Button variant="outlined" onClick={() => navigate('/professor/rfi')}>
          Go to RFI Generation
        </Button>
      </div>

      {/* Phase 2 note */}
      <p className="font-body text-xs text-deep-green/75 dark:text-card/75">
        Submission monitoring will update automatically when database integration is complete in
        Phase 2.
      </p>
    </div>
  )
}
