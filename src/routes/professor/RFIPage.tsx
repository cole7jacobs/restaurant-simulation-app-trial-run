import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'

import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { DEMO_TEAMS } from './demo-teams'

const submittedTeams = DEMO_TEAMS.filter((team) => team.status === 'submitted')

/**
 * RFI File Generation page — Milestone 1.2.
 *
 * UI placeholder for Phase 4 — generates FORTRAN-compatible input files for each team.
 * Open question OQ-1 (RFI file format) must be resolved before implementation.
 */
export function RFIPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader title="RFI File Generation" subtitle={`Round ${DEV_PREVIEW_ROUND}`} />

      {/* Not-yet-implemented notice */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 text-amber-800 dark:text-amber-200 font-body text-sm">
        ⚠ Not yet implemented — RFI generation will be available in Phase 4 once the RFI file
        format is confirmed (OQ-1).
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

      {/* Generate all card */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-3">
          Generate All
        </h2>
        <p className="font-body text-sm text-slate-600 dark:text-slate-400 mb-4">
          Generates a single .TXT input file for each submitted team, formatted for the FORTRAN
          simulation.
        </p>
        <Button disabled>Generate All RFI Files</Button>
        <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-3">
          Requires OQ-1 (RFI format) to be resolved before implementation.
        </p>
      </Card>
    </div>
  )
}
