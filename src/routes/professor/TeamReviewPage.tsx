import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { DEV_PREVIEW_ROUND } from '../../lib/dev-preview'
import { DEMO_TEAMS } from './demo-teams'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'

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
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader title="Team Decision Review" subtitle={`${team.name} · Round ${DEV_PREVIEW_ROUND}`} />

      {/* Menu Decisions */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Menu Decisions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-deep-green/10 dark:border-card/10 text-left">
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Item</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Prep</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Portion</th>
                <th className="pb-2 pr-4 font-medium text-deep-green dark:text-card">Advertising</th>
                <th className="pb-2 font-medium text-deep-green dark:text-card">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-deep-green/5 dark:divide-card/5">
              <tr>
                <td className="py-3 pr-4 text-deep-green dark:text-card">{item}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{prep}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{portion}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">—</td>
                <td className="py-3 text-slate-600 dark:text-slate-400">{price}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Staffing & Compensation */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Staffing &amp; Compensation
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm font-body">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Staff Per Day</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">{staff}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Hourly Compensation</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$14.50</dd>
          </div>
        </dl>
      </Card>

      {/* Amenities & Upkeep */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Amenities &amp; Upkeep
        </h2>
        <dl className="grid grid-cols-3 gap-4 text-sm font-body">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Amenities/Order</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$2.50</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Entertainment</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$800</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Maintenance</dt>
            <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$500</dd>
          </div>
        </dl>
      </Card>

      {/* Management & Finance */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-deep-green dark:text-card mb-4">
          Management &amp; Finance
        </h2>
        <div className="space-y-4 text-sm font-body">
          <div>
            <p className="font-medium text-deep-green dark:text-card mb-2">Reports</p>
            <div className="flex flex-wrap gap-4">
              <span className="text-green-700 dark:text-green-400">Guest Satisfaction ✓</span>
              <span className="text-green-700 dark:text-green-400">Financial ✓</span>
              <span className="text-slate-500 dark:text-slate-400">Product ✗</span>
            </div>
          </div>
          <div>
            <p className="font-medium text-deep-green dark:text-card mb-2">Finance</p>
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Time Deposit</dt>
                <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$0</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">CD Change</dt>
                <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$0</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Note Payable</dt>
                <dd className="font-semibold text-deep-green dark:text-card mt-0.5">$0</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button variant="outlined" onClick={() => navigate('/professor/submissions')}>
          ← Back to Submissions
        </Button>
      </div>

      {/* Phase 3 note */}
      <p className="font-body text-xs text-slate-500 dark:text-slate-400">
        This is placeholder data. Real decisions will be displayed after Phase 3.
      </p>
    </div>
  )
}
