import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'

import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { DEMO_TEAMS } from './demo-teams'

const submittedTeams = DEMO_TEAMS.filter((team) => team.status === 'submitted')

/**
 * Professor home page — Milestone 1.2.
 *
 * Shows a round summary, team submission status table, and quick-action cards.
 * Phase 2: replace demo data with live round management API calls.
 */
export function ProfessorHomePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Professor Dashboard"
        subtitle={`Round ${DEV_PREVIEW_ROUND} · Fall 2026`}
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="font-body text-sm text-slate-600 dark:text-slate-400">Active Round</p>
          <p className="font-heading text-3xl font-bold text-primary mt-1">{DEV_PREVIEW_ROUND}</p>
        </Card>
        <Card>
          <p className="font-body text-sm text-slate-600 dark:text-slate-400">Teams</p>
          <p className="font-heading text-3xl font-bold text-primary mt-1">{DEMO_TEAMS.length}</p>
        </Card>
        <Card>
          <p className="font-body text-sm text-slate-600 dark:text-slate-400">Submitted</p>
          <p className="font-heading text-3xl font-bold text-primary mt-1">{submittedTeams.length}</p>
          <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-1">
            {submittedTeams.length} of {DEMO_TEAMS.length} teams
          </p>
        </Card>
      </div>

      {/* Team submissions table */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Team Submissions — Round {DEV_PREVIEW_ROUND}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-deep-green/10 dark:border-card/10 text-left">
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Team</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Firm</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Status</th>
                <th className="pb-2 font-medium text-deep-green dark:text-card">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep-green/5 dark:divide-card/5">
              {DEMO_TEAMS.map((team) => (
                <tr key={team.name}>
                  <td className="py-3 pr-4 text-deep-green dark:text-card">{team.name}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{team.firm}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={team.status}>
                      {team.status.charAt(0).toUpperCase() + team.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {team.decisions && (
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => navigate(`/professor/team-review/${team.id}`)}
                      >
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-heading text-base font-semibold text-deep-green dark:text-card mb-2">
            Generate RFI Files
          </h2>
          <p className="font-body text-sm text-slate-600 dark:text-slate-400 mb-4">
            Export submitted team decisions as FORTRAN-compatible RFI input files for the
            simulation engine. Available after OQ-1 is resolved.
          </p>
          <Button variant="outlined" onClick={() => navigate('/professor/rfi')}>
            Go to RFI Generator
          </Button>
        </Card>
        <Card>
          <h2 className="font-heading text-base font-semibold text-deep-green dark:text-card mb-2">
            Import Results
          </h2>
          <p className="font-body text-sm text-slate-600 dark:text-slate-400 mb-4">
            Upload a FR.LST simulation output file to import round results for all teams.
            Available after OQ-2 is resolved.
          </p>
          <Button variant="outlined" onClick={() => navigate('/professor/import')}>
            Go to FR.LST Import
          </Button>
        </Card>
      </div>
    </div>
  )
}
