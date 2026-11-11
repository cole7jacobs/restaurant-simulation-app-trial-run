import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'

const ROUND = 3

interface TeamRow {
  name: string
  firm: string
  submittedAt: string | null
  decisionCount: string
  teamId: number | null
}

const TEAMS: TeamRow[] = [
  {
    name: 'Team Alpha',
    firm: 'Firm 1',
    submittedAt: 'Nov 8, 2026 2:34 PM',
    decisionCount: '4/4 sections',
    teamId: 1,
  },
  {
    name: 'Team Beta',
    firm: 'Firm 2',
    submittedAt: 'Nov 9, 2026 10:15 AM',
    decisionCount: '4/4',
    teamId: 2,
  },
  {
    name: 'Team Gamma',
    firm: 'Firm 3',
    submittedAt: null,
    decisionCount: '2/4',
    teamId: null,
  },
  {
    name: 'Team Delta',
    firm: 'Firm 4',
    submittedAt: null,
    decisionCount: '0/4',
    teamId: null,
  },
]

/**
 * Submission monitoring page — Milestone 1.2.
 *
 * Shows submission status for all teams in the current round.
 * Phase 2: replace demo data with live database queries.
 */
export function SubmissionsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader title="Team Submissions" subtitle={`Round ${ROUND}`} />

      {/* Submissions table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-deep-green/10 dark:border-card/10 text-left">
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Team</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Firm</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Submitted At</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Decision Count</th>
                <th className="pb-2 font-medium text-deep-green dark:text-card">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep-green/5 dark:divide-card/5">
              {TEAMS.map((team) => (
                <tr key={team.name}>
                  <td className="py-3 pr-4 text-deep-green dark:text-card">{team.name}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{team.firm}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    {team.submittedAt ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                    {team.decisionCount}
                  </td>
                  <td className="py-3">
                    {team.teamId !== null ? (
                      <Button
                        variant="outlined"
                        size="sm"
                        onClick={() => navigate(`/professor/team-review/${team.teamId}`)}
                      >
                        View Decisions
                      </Button>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export action */}
      <div>
        <Button variant="outlined" onClick={() => navigate('/professor/rfi')}>
          Export All Submitted as RFI
        </Button>
      </div>

      {/* Phase 2 note */}
      <p className="font-body text-xs text-slate-500 dark:text-slate-400">
        Submission monitoring will update automatically when database integration is complete in
        Phase 2.
      </p>
    </div>
  )
}
