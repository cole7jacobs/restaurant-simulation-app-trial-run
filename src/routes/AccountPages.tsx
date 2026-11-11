import { Link, useParams } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth, useProtectedData } from '../context/AuthContext'

export function StudentAccountHome() {
  const { session } = useAuth()
  const { data, error } = useProtectedData<{ team: {
    TeamID: number
    TeamName: string
    FirmNumber: number | null
  } }>('/student/team')

  return (
    <div className="space-y-6">
      <PageHeader title="Welcome back" subtitle={session?.account.name} />
      <Card>
        <h2 className="font-heading text-lg font-semibold">Your team</h2>
        {data ? (
          <p>{data.team.TeamName} · {data.team.FirmNumber === null ? 'Firm not assigned' : `Firm ${data.team.FirmNumber}`}</p>
        ) : <p role={error ? 'alert' : 'status'}>{error ?? 'Loading team…'}</p>}
      </Card>
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
    <div className="space-y-6">
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
                <tbody className="divide-y divide-deep-green/10 dark:divide-card/10">
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
  return <div className="space-y-6"><PageHeader title={title} /><Card><p>{description}</p></Card></div>
}
