import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { DEMO_TEAMS } from './demo-teams'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'

/**
 * Team Decision Review page — Milestone 1.2.
 *
 * Read-only professor view of a team's submitted decisions for the current round.
 * Phase 3: replace placeholder data with real decisions loaded via route param :teamId.
 */
export function TeamReviewPage() {
  const navigate = useNavigate()
  const { teamId } = useParams()
  const team = DEMO_TEAMS.find(({ id }) => id === teamId)

  if (!team?.decisions) {
    return (
      <EmptyState
        title={team ? 'No submitted decisions' : 'Team not found'}
        description={team ? `${team.name} has no submitted decisions for this round.` : 'Select a team from the submissions list.'}
      >
        <Button variant="outlined" onClick={() => navigate('/professor/submissions')}>
          Back to Submissions
        </Button>
      </EmptyState>
    )
  }

  const { item, prep, portion, price, staff } = team.decisions

  return (
    <div className="space-y-4">
      {/* Page header */}
      <PageHeader title="Team Decision Review" subtitle={`${team.name} · Round ${DEV_PREVIEW_ROUND}`} />

      {/* Menu Decisions */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Menu Decisions
        </h2>
        <DataTable
          caption="Menu decisions"
          columns={['Item', 'Prep', 'Portion', 'Advertising', 'Price']}
          rows={[{ key: String(item), cells: [item, prep, portion, '—', price] }]}
        />
      </Card>

      {/* Staffing & Compensation */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Staffing &amp; Compensation
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm font-body">
          <div>
            <dt className="text-deep-green/75 dark:text-card/75">Staff Per Day</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">{staff}</dd>
          </div>
          <div>
            <dt className="text-deep-green/75 dark:text-card/75">Hourly Compensation</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$14.50</dd>
          </div>
        </dl>
      </Card>

      {/* Amenities & Upkeep */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Amenities &amp; Upkeep
        </h2>
        <dl className="grid grid-cols-3 gap-4 text-sm font-body">
          <div>
            <dt className="text-deep-green/75 dark:text-card/75">Amenities/Order</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$2.50</dd>
          </div>
          <div>
            <dt className="text-deep-green/75 dark:text-card/75">Entertainment</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$800</dd>
          </div>
          <div>
            <dt className="text-deep-green/75 dark:text-card/75">Maintenance</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$500</dd>
          </div>
        </dl>
      </Card>

      {/* Management & Finance */}
      <Card>
        <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card mb-4">
          Management &amp; Finance
        </h2>
        <div className="space-y-4 text-sm font-body">
          <div>
            <p className="font-medium text-deep-green dark:text-card mb-2">Reports</p>
            <div className="flex flex-wrap gap-3">
              <span className="text-deep-green dark:text-card">Guest Satisfaction ✓</span>
              <span className="text-deep-green dark:text-card">Financial ✓</span>
              <span className="text-deep-green/75 dark:text-card/75">Product ✗</span>
            </div>
          </div>
          <div>
            <p className="font-medium text-deep-green dark:text-card mb-2">Finance</p>
            <dl className="grid grid-cols-3 gap-3">
              <div>
                <dt className="text-deep-green/75 dark:text-card/75">Time Deposit</dt>
                <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$0</dd>
              </div>
              <div>
                <dt className="text-deep-green/75 dark:text-card/75">CD Change</dt>
                <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$0</dd>
              </div>
              <div>
                <dt className="text-deep-green/75 dark:text-card/75">Note Payable</dt>
                <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$0</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outlined" onClick={() => navigate('/professor/submissions')}>
          ← Back to Submissions
        </Button>
      </div>

      {/* Phase 3 note */}
      <p className="font-body text-xs text-deep-green/75 dark:text-card/75">
        This is placeholder data. Real decisions will be displayed after Phase 3.
      </p>
    </div>
  )
}
