import { Link, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Button } from '../components/ui/Button'
import { useAuth, useProtectedData } from '../context/AuthContext'
import { DecisionSectionTiles } from './student/DecisionSectionTiles'

export function StudentAccountHome({ demo = false }: { demo?: boolean }) {
  return demo ? <StudentHomeContent demo data={{ team: { TeamID: -1, TeamName: 'Demo Bistro', FirmNumber: 1 } }} /> : <StudentHomeLive />
}

function StudentHomeLive() {
  const { session } = useAuth()
  const { data, error } = useProtectedData<{ team: {
    TeamID: number
    TeamName: string
    FirmNumber: number | null
  } }>('/student/team')

  return <StudentHomeContent data={data} error={error} name={session?.account.name} />
}

function StudentHomeContent({ data, error, name, demo = false }: { data?: { team: { TeamID: number; TeamName: string; FirmNumber: number | null } }; error?: string; name?: string; demo?: boolean }) {
  const prefix = demo ? '/demo' : ''
  return (
    <div className="space-y-4">
      <PageHeader title="Welcome back" subtitle={demo ? 'Demo Bistro · Q5' : name} />

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

      <DecisionSectionTiles prefix={prefix} />

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="flex flex-col items-start gap-3">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card">Enter decisions</h2>
            <p className="mt-1 font-body text-sm text-deep-green/75 dark:text-card/75">
              Set your menu, staffing and finance choices for a round.
            </p>
          </div>
          <Button to={prefix + '/student/decisions'} variant="primary">Enter decisions</Button>
        </Card>
        <Card className="flex flex-col items-start gap-3">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-deep-green dark:text-card">View results</h2>
            <p className="mt-1 font-body text-sm text-deep-green/75 dark:text-card/75">
              See your imported results and charts by round.
            </p>
          </div>
          <Button to={prefix + '/student/results'} variant="outlined">View results</Button>
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

export function ProfessorAccountPage({ title, teamOnly = false, demo = false, embedded = false }: { title: string; teamOnly?: boolean; demo?: boolean; embedded?: boolean }) {
  return demo ? <ProfessorAccountContent title={title} teamOnly={teamOnly} demo embedded={embedded} rows={[{ TeamID: -1, TeamName: 'Demo Bistro', FirmNumber: 1, RoundNumber: 5, SubmittedAt: null }]} /> : <ProfessorAccountLive title={title} teamOnly={teamOnly} embedded={embedded} />
}

function ProfessorAccountLive({ title, teamOnly, embedded }: { title: string; teamOnly: boolean; embedded: boolean }) {
  const { teamId } = useParams()
  const { data, error } = useProtectedData<{ submissions: Submission[] }>('/professor/submissions')
  const rows = data?.submissions.filter((row) => !teamOnly || String(row.TeamID) === teamId)

  return <ProfessorAccountContent title={title} teamOnly={teamOnly} rows={rows} error={error} embedded={embedded} />
}

function ProfessorAccountContent({ title, teamOnly, rows, error, demo = false, embedded = false }: { title: string; teamOnly: boolean; rows?: Submission[]; error?: string; demo?: boolean; embedded?: boolean }) {
  return (
    <div className="space-y-4">
      {!embedded && <PageHeader title={title} />}
      <Card className={embedded ? 'professor-tile-inner' : ''}>
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
                      <td className="p-2">{teamOnly || demo ? row.TeamName : (
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
      {teamOnly && <Button to="/professor/home#submissions" variant="outlined">Back to submissions</Button>}
    </div>
  )
}

export function PendingAccountPage({ title, description }: { title: string; description: string }) {
  return <div className="space-y-4"><PageHeader title={title} /><Card><p>{description}</p></Card></div>
}
