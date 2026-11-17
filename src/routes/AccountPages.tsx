import { Link, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Button } from '../components/ui/Button'
import { useAuth, useProtectedData } from '../context/AuthContext'

export function StudentAccountHome() {
  const { session } = useAuth()
  const { data, error } = useProtectedData<{ team: {
    TeamID: number
    TeamName: string
    FirmNumber: number | null
  } }>('/student/team')

  return (
    <div className="space-y-4">
      <PageHeader title="Welcome back" subtitle={session?.account.name} />

      {/* Team stat cards */}
      {data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricCard label="Your team" value={data.team.TeamName} />
          {data.team.FirmNumber === null ? (
            <MetricCard label="Firm" value="—" subtext="Firm not assigned" />
          ) : (
            <MetricCard label="Firm" value={String(data.team.FirmNumber)} ticker />
          )}
        </div>
      ) : (
        <Card>
          <p role={error ? 'alert' : 'status'} className="font-body text-sm">{error ?? 'Loading team…'}</p>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="flex flex-col items-start gap-3">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card">Enter decisions</h2>
            <p className="mt-1 font-body text-sm text-deep-green/75 dark:text-card/75">
              Set your menu, staffing and finance choices for a round.
            </p>
          </div>
          <Link to="/student/decisions">
            <Button variant="primary">Enter decisions</Button>
          </Link>
        </Card>
        <Card className="flex flex-col items-start gap-3">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card">View results</h2>
            <p className="mt-1 font-body text-sm text-deep-green/75 dark:text-card/75">
              See your imported results and charts by round.
            </p>
          </div>
          <Link to="/student/results">
            <Button variant="outlined">View results</Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}

type Submission = {
  TeamID: number
  TeamName: string
  FirmNumber: number | null
  RoundNumber: number | null
  SubmittedAt: string | null
}

export function ProfessorAccountPage({ title, teamOnly = false }: { title: string; teamOnly?: boolean }) {
  const { teamId } = useParams()
  const { data, error } = useProtectedData<{ submissions: Submission[] }>('/professor/submissions')
  const rows = data?.submissions.filter((row) => !teamOnly || String(row.TeamID) === teamId)

  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <Card>
        {!rows ? <p role={error ? 'alert' : 'status'}>{error ?? 'Loading team submissions…'}</p>
          : rows.length === 0 ? <p>No teams found.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr>
                  <th scope="col" className="p-2">Team</th>
                  <th scope="col" className="p-2">Firm</th>
                  <th scope="col" className="p-2">Round</th>
                  <th scope="col" className="p-2">Submission status</th>
                </tr></thead>
                <tbody className="divide-y divide-deep-green/20 dark:divide-card/10">
                  {rows.map((row) => (
                    <tr key={`${row.TeamID}:${row.RoundNumber}`}>
                      <td className="p-2">{teamOnly ? row.TeamName : (
                        <Link className="underline" to={`/professor/team-review/${row.TeamID}`}>{row.TeamName}</Link>
                      )}</td>
                      <td className="p-2">{row.FirmNumber ?? 'Unassigned'}</td>
                      <td className="p-2">{row.RoundNumber ?? '—'}</td>
                      <td className="p-2">{row.SubmittedAt
                        ? <>Submitted <time dateTime={row.SubmittedAt}>{row.SubmittedAt}</time></>
                        : row.RoundNumber === null ? 'No decisions' : 'Draft'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  )
}

export function PendingAccountPage({ title, description }: { title: string; description: string }) {
  return <div className="space-y-4"><PageHeader title={title} /><Card><p>{description}</p></Card></div>
}
