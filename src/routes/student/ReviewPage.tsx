import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { DataTable } from '../../components/ui/DataTable'
import { useDevPreview } from '../../context/DevPreviewContext'

// ---------------------------------------------------------------------------
// Placeholder data tables (mirrors DecisionsPage placeholders)
// ---------------------------------------------------------------------------

function MenuTable() {
  return (
    <DataTable
      caption="Menu decisions"
      columns={['Item', 'Preparation', 'Portion (Gm./Cl.)', 'Advertising ($)', 'Price ($)']}
      rows={[
        ['Steak', 'Filet', '250', '150', '$28.00'],
        ['Chicken', 'Game Hen', '200', '100', '$18.00'],
        ['Wine', 'Imported', '30', '80', '$12.00'],
        ['Beer', '—', '50', '60', '$7.00'],
      ].map((cells) => ({ key: cells[0], cells }))}
    />
  )
}

function StaffingTable() {
  return (
    <table className="w-full text-sm font-body">
      <tbody className="divide-y divide-deep-green/10 dark:divide-card/5">
        <tr>
          <td className="py-2 font-medium text-deep-green dark:text-card pr-4">Staff Per Day</td>
          <td className="py-2 text-deep-green dark:text-card">12</td>
        </tr>
        <tr>
          <td className="py-2 font-medium text-deep-green dark:text-card pr-4">
            Hourly Compensation ($)
          </td>
          <td className="py-2 text-deep-green dark:text-card">$14.50</td>
        </tr>
      </tbody>
    </table>
  )
}

function AmenitiesTable() {
  return (
    <table className="w-full text-sm font-body">
      <tbody className="divide-y divide-deep-green/10 dark:divide-card/5">
        {[
          ['Amenities Per Order ($)', '$2.50'],
          ['Entertainment Budget ($)', '$800'],
          ['Maintenance Budget ($)', '$500'],
        ].map(([label, val]) => (
          <tr key={label}>
            <td className="py-2 font-medium text-deep-green dark:text-card pr-4">{label}</td>
            <td className="py-2 text-deep-green dark:text-card">{val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FinanceTable() {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-body text-xs font-semibold text-deep-green/75 dark:text-card/75 uppercase tracking-wider mb-2">
          Management Information
        </p>
        <table className="w-full text-sm font-body">
          <tbody className="divide-y divide-deep-green/10 dark:divide-card/5">
            {['Guest Satisfaction Report', 'Financial Report', 'Product Report'].map((label) => (
              <tr key={label}>
                <td className="py-2 font-medium text-deep-green dark:text-card pr-4">{label}</td>
                <td className="py-2 text-deep-green dark:text-card">☐ Off</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p className="font-body text-xs font-semibold text-deep-green/75 dark:text-card/75 uppercase tracking-wider mb-2">
          Finance
        </p>
        <table className="w-full text-sm font-body">
          <tbody className="divide-y divide-deep-green/10 dark:divide-card/5">
            {[
              'Time Deposit Change',
              'Certificate of Deposit Change',
              'Note Payable Change',
            ].map((label) => (
              <tr key={label}>
                <td className="py-2 font-medium text-deep-green dark:text-card pr-4">{label}</td>
                <td className="py-2 text-deep-green dark:text-card">0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section cards config
// ---------------------------------------------------------------------------

const REVIEW_SECTIONS = [
  { title: 'Menu', Content: MenuTable },
  { title: 'Staffing & Compensation', Content: StaffingTable },
  { title: 'Amenities & Upkeep', Content: AmenitiesTable },
  { title: 'Management & Finance', Content: FinanceTable },
] as const

// ---------------------------------------------------------------------------
// ReviewPage
// ---------------------------------------------------------------------------

/**
 * Read-only summary of decisions before submission.
 * All sections are always visible (no accordion toggle).
 * Submission will be enabled in Phase 3.
 */
export function ReviewPage() {
  const { teamName, roundNumber } = useDevPreview()

  return (
    <div className="space-y-4">
      <PageHeader
        title="Review Decisions"
        subtitle={`Round ${roundNumber} · ${teamName}`}
      />

      {/* One card per decision category */}
      {REVIEW_SECTIONS.map(({ title, Content }) => (
        <Card key={title}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="font-heading text-xl font-extrabold text-deep-green dark:text-card">
              {title}
            </h2>
            <Button to="/student/decisions" variant="outlined" size="sm">
              Edit
            </Button>
          </div>
          <Content />
        </Card>
      ))}

      {/* Submit */}
      <div className="space-y-2 pb-4">
        <Button variant="primary" disabled>
          Submit Decisions
        </Button>
        <p className="font-body text-xs text-deep-green/75 dark:text-card/75">
          Submission will be enabled in Phase 3 once data saving is implemented.
        </p>
      </div>
    </div>
  )
}
