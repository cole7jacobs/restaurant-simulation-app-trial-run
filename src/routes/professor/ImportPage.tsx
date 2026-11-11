import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'

const ROUND = 3

/**
 * FR.LST Import page — Milestone 1.2.
 *
 * UI placeholder for Phase 5 — imports FORTRAN simulation output results.
 * Open question OQ-2 (output format) must be resolved before implementation.
 */
export function ImportPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader title="Import Simulation Results" subtitle={`Round ${ROUND}`} />

      {/* Not-yet-implemented notice */}
      <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 text-amber-800 dark:text-amber-200 font-body text-sm">
        ⚠ Not yet implemented — FR.LST import will be available in Phase 5 once the output format
        is confirmed (OQ-2).
      </div>

      {/* Upload area */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Upload FR.LST File
        </h2>

        {/* Dashed upload drop zone — not functional, UI placeholder */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-deep-green/20 dark:border-card/20 py-10 px-6 text-center">
          <span className="text-4xl" aria-hidden>↑</span>
          <p className="font-body font-medium text-deep-green dark:text-card">
            Drop FR.LST file here or click to upload
          </p>
          <p className="font-body text-xs text-slate-500 dark:text-slate-400">
            Only FR.LST simulation output files are accepted
          </p>
          <Button disabled>Select File</Button>
        </div>

        <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-3">
          File upload is not functional yet. This is a UI placeholder for Phase 5.
        </p>
      </Card>

      {/* Import history */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Import History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-deep-green/10 dark:border-card/10 text-left">
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Round</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Imported At</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Teams</th>
                <th className="pb-2 font-medium text-deep-green dark:text-card">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep-green/5 dark:divide-card/5">
              <tr>
                <td className="py-3 pr-4 text-deep-green dark:text-card">Round 2</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">Nov 1, 2026</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">4/4</td>
                <td className="py-3">
                  <Badge variant="info">Imported</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="font-body text-xs text-slate-500 dark:text-slate-400 mt-3">
          Import history will be populated after Phase 5.
        </p>
      </Card>
    </div>
  )
}
