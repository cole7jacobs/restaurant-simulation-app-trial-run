import { useState } from 'react'
import { useAuth, useProtectedData } from '../../context/AuthContext'
import { decisionRounds } from '../../../shared/decisions'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'

import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { DEMO_TEAMS } from './demo-teams'

const submittedTeams = DEMO_TEAMS.filter((team) => team.status === 'submitted')

export function RFIPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader title="RFI File Generation" subtitle={`Round ${DEV_PREVIEW_ROUND}`} />

      <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 text-amber-800 dark:text-amber-200 font-body text-sm">
        Sign in as a professor to generate files from submitted decisions.
      </div>

      {/* Submitted teams ready for export */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Teams Ready for RFI Export
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-deep-green/10 dark:border-card/10 text-left">
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Team</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Firm</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Submitted</th>
                <th className="pb-2 font-medium text-deep-green dark:text-card">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep-green/5 dark:divide-card/5">
              {submittedTeams.map((team) => (
                <tr key={team.name}>
                  <td className="py-3 pr-4 text-deep-green dark:text-card">{team.name}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{team.firm}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Submitted
                    </span>
                  </td>
                  <td className="py-3">
                    <Button variant="outlined" size="sm" disabled>
                      Download RFI
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}

type ExportTeam = {
  TeamID: number
  TeamName: string
  FirmNumber: number | null
  SubmittedAt: string | null
  HasDecisions: number
}

function RoundExports({ round }: { round: number }) {
  const { data, error } = useProtectedData<{ teams: ExportTeam[] }>(`/professor/rfi/${round}`)
  const { expire } = useAuth()
  const [busy, setBusy] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ text: string; failed: boolean } | null>(null)

  async function download(teamId: number) {
    setBusy(teamId)
    setFeedback(null)
    try {
      const response = await fetch(`/api/professor/rfi/${round}/${teamId}`, { cache: 'no-store' })
      if (response.status === 401) {
        expire()
        return
      }
      if (!response.ok) {
        const detail = await response.json().catch(() => null)
        throw new Error(detail?.error ?? 'Unable to generate the RFI file.')
      }
      const filename = response.headers.get('Content-Disposition')?.match(/filename="(RFI[1-5]ME\.TXT)"/)?.[1]
      if (!filename) throw new Error('The server did not return an RFI filename.')

      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setFeedback({ text: `Download started for ${filename}.`, failed: false })
    } catch (failure) {
      setFeedback({
        text: failure instanceof Error && !(failure instanceof TypeError)
          ? failure.message : 'Unable to download the RFI file. Try again.',
        failed: true,
      })
    } finally {
      setBusy(null)
    }
  }

  if (!data) return <p role={error ? 'alert' : 'status'}>{error ?? 'Loading teams…'}</p>
  if (data.teams.length === 0) return <Card>No teams available.</Card>
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr>
            <th scope="col" className="p-2">Team</th>
            <th scope="col" className="p-2">Firm</th>
            <th scope="col" className="p-2">Submission status</th>
            <th scope="col" className="p-2">Download</th>
          </tr></thead>
          <tbody className="divide-y divide-deep-green/10 dark:divide-card/10">
            {data.teams.map((team) => (
              <tr key={team.TeamID}>
                <th scope="row" className="p-2 font-medium">{team.TeamName}</th>
                <td className="p-2">{team.FirmNumber ?? 'Unassigned'}</td>
                <td className="p-2">{team.SubmittedAt ? 'Submitted' : team.HasDecisions ? 'Draft' : 'No decisions'}</td>
                <td className="p-2">
                  <Button size="sm" disabled={!team.SubmittedAt || busy !== null}
                    aria-label={`Generate RFI for ${team.TeamName}`}
                    onClick={() => void download(team.TeamID)}>
                    {busy === team.TeamID ? 'Generating…' : 'Generate RFI'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {feedback && <p className="mt-4 text-sm" role={feedback.failed ? 'alert' : 'status'}>{feedback.text}</p>}
    </Card>
  )
}

export function ProfessorRFIPage() {
  const [round, setRound] = useState(decisionRounds[0])
  return (
    <div className="space-y-6">
      <PageHeader title="RFI File Generation" />
      <label className="inline-grid gap-1 text-sm font-medium">Simulation round
        <select className="rounded border border-deep-green/30 bg-white px-2 py-2 dark:border-card/30 dark:bg-dark-card"
          value={round} onChange={(event) => setRound(Number(event.target.value))}>
          {decisionRounds.map((period) => <option key={period} value={period}>Q{period}</option>)}
        </select>
      </label>
      <RoundExports key={round} round={round} />
    </div>
  )
}
