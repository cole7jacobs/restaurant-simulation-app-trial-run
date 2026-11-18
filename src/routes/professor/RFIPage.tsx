import { generateRfi } from '../../../worker/rfi'
import { loadPreviewDecision } from '../../lib/preview-decisions'
import { useState } from 'react'
import { useAuth, useProtectedData } from '../../context/AuthContext'
import { decisionRounds } from '../../../shared/decisions'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Notice } from '../../components/ui/Notice'
import { DataTable } from '../../components/ui/DataTable'

import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { DEMO_TEAMS } from './demo-teams'

const submittedTeams = DEMO_TEAMS.filter((team) => team.status === 'submitted')

export function RFIPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      {!embedded && <PageHeader title="RFI File Generation" subtitle={`Round ${DEV_PREVIEW_ROUND}`} />}

      <Notice variant="info">
        Sign in as a professor to generate files from submitted decisions.
      </Notice>

      {/* Submitted teams ready for export */}
      <Card className={embedded ? 'professor-tile-inner' : ''}>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Teams Ready for RFI Export
        </h2>
        <DataTable
          caption="Teams ready for RFI export"
          columns={['Team', 'Firm', 'Submitted', 'Actions']}
          rows={submittedTeams.map((team) => ({
            key: team.name,
            cells: [
              team.name,
              team.firm,
              <Badge variant="submitted">Submitted</Badge>,
              <Button variant="outlined" size="sm" disabled>
                Download RFI
              </Button>,
            ],
          }))}
        />
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

function RoundExports({ round, embedded }: { round: number; embedded: boolean }) {
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
  if (data.teams.length === 0) return <Card className={embedded ? 'professor-tile-inner' : ''}>No teams available.</Card>
  return (
    <Card className={embedded ? 'professor-tile-inner' : ''}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr>
            <th scope="col" className="p-2">Team</th>
            <th scope="col" className="p-2">Firm</th>
            <th scope="col" className="p-2">Submission status</th>
            <th scope="col" className="p-2">Download</th>
          </tr></thead>
          <tbody className="divide-y divide-deep-green/20 dark:divide-card/10">
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

function DemoExports({ embedded }: { embedded: boolean }) {
  const [message, setMessage] = useState('')
  function download() {
    try {
      const draft = loadPreviewDecision(5, true)
      const menu = draft.menu.map(({ MenuItemID, ...row }) => ({ ...row, ItemName: draft.catalog.find((item) => item.MenuItemID === MenuItemID)?.ItemName ?? '' }))
      const file = generateRfi(1, draft.values, menu)
      const url = URL.createObjectURL(new Blob([file.content], { type: 'text/plain' }))
      const link = document.createElement('a'); link.href = url; link.download = file.filename; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('Sample RFI download started. No data was sent to the server.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to generate sample RFI.') }
  }
  return <Card className={embedded ? 'professor-tile-inner' : ''}><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Team</th><th className="p-2">Firm</th><th className="p-2">Submission status</th><th className="p-2">Download</th></tr></thead><tbody><tr><td className="p-2">Demo Bistro</td><td className="p-2">1</td><td className="p-2">Sample</td><td className="p-2"><Button size="sm" onClick={download}>Generate RFI</Button></td></tr></tbody></table></div>{message && <p role="status">{message}</p>}</Card>
}

export function ProfessorRFIPage({ demo = false, embedded = false }: { demo?: boolean; embedded?: boolean }) {
  const [round, setRound] = useState(demo ? 5 : decisionRounds[0])
  return (
    <div className="space-y-4">
      {!embedded && <PageHeader title="RFI File Generation" />}
      <label className="inline-grid gap-1 text-sm font-medium">{embedded ? 'RFI simulation round' : 'Simulation round'}
        <select className="rounded border border-deep-green/30 bg-card/50 px-2 py-2 dark:border-card/30 dark:bg-dark-card"
          value={round} onChange={(event) => setRound(Number(event.target.value))}>
          {(demo ? [5] : decisionRounds).map((period) => <option key={period} value={period}>Q{period}</option>)}
        </select>
      </label>
      {demo ? <DemoExports embedded={embedded} /> : <RoundExports key={round} round={round} embedded={embedded} />}
    </div>
  )
}
