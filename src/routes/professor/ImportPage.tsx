import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { Notice } from '../../components/ui/Notice'

const ROUND = 3

/**
 * FR.LST Import page — Milestone 1.2.
 *
 * UI placeholder for Phase 5 — imports FORTRAN simulation output results.
 * Open question OQ-2 (output format) must be resolved before implementation.
 */
export function ImportPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className="space-y-4">
      {/* Page header */}
      {!embedded && <PageHeader title="Import Simulation Results" subtitle={`Round ${ROUND}`} />}

      {/* Not-yet-implemented notice */}
      <Notice variant="info">
        Sign in as a professor to preview and import FR.LST results.
      </Notice>

      {/* Upload area */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Upload FR.LST File
        </h2>

        {/* Dashed upload drop zone — not functional, UI placeholder */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-deep-green/20 dark:border-card/20 py-10 px-6 text-center">
          <span className="text-4xl" aria-hidden>↑</span>
          <p className="font-body font-medium text-deep-green dark:text-card">
            Drop FR.LST file here or click to upload
          </p>
          <p className="font-body text-xs text-deep-green/75 dark:text-card/75">
            Only FR.LST simulation output files are accepted
          </p>
          <Button disabled>Select File</Button>
        </div>

        <p className="font-body text-xs text-deep-green/75 dark:text-card/75 mt-3">
          File upload requires a professor account.
        </p>
      </Card>

      {/* Import history */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Import History
        </h2>
        <DataTable
          caption="Import history"
          columns={['Round', 'Imported At', 'Teams', 'Status']}
          rows={[
            {
              key: 'round-2',
              cells: ['Round 2', 'Nov 1, 2026', '4/4', <Badge variant="info">Imported</Badge>],
            },
          ]}
        />
        <p className="font-body text-xs text-deep-green/75 dark:text-card/75 mt-3">
          Example import history.
        </p>
      </Card>
    </div>
  )
}
