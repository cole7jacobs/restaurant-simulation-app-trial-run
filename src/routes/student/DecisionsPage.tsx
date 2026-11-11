import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { SectionNav } from '../../components/ui/SectionNav'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { useDevPreview } from '../../context/DevPreviewContext'

// ---------------------------------------------------------------------------
// Inner section components (placeholder UI — no actual form saving)
// ---------------------------------------------------------------------------

function MenuSection() {
  return (
    <div className="space-y-4">
      <p className="font-body text-sm text-slate-600 dark:text-slate-400">
        Enter your menu decisions for this round. Up to 8 items.
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-deep-green/10 dark:border-card/10">
              {['Item', 'Preparation', 'Portion (Gm./Cl.)', 'Advertising ($)', 'Price ($)'].map(
                (h) => (
                  <th
                    key={h}
                    className="pb-2 pr-4 text-left font-medium text-deep-green dark:text-card"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-deep-green/5 dark:divide-card/5">
            {[
              ['Steak', 'Filet', '250', '150', '28.00'],
              ['Chicken', 'Game Hen', '200', '100', '18.00'],
              ['Wine', 'Imported', '30', '80', '12.00'],
              ['Beer', '—', '50', '60', '7.00'],
            ].map((row) => (
              <tr key={row[0]}>
                {row.map((val, i) => (
                  <td key={i} className="py-2 pr-4">
                    <input
                      type="text"
                      disabled
                      defaultValue={val}
                      className="w-full rounded border border-deep-green/20 dark:border-card/20 bg-white dark:bg-dark-bg px-2 py-1 text-sm text-deep-green dark:text-card disabled:opacity-60"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-body text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        ⚠ Open Question OQ-4/OQ-5: Complete menu item list and preparation levels pending
        professor confirmation. Fields are shown for reference only.
      </p>

      <SaveContinueButton />
    </div>
  )
}

function StaffingSection() {
  return (
    <div className="space-y-4">
      <div>
        <label className="block font-body text-sm font-medium text-deep-green dark:text-card mb-1">
          Staff Per Day
        </label>
        <input
          type="number"
          disabled
          placeholder="12"
          className="w-full max-w-xs rounded border border-deep-green/20 dark:border-card/20 bg-white dark:bg-dark-bg px-3 py-2 text-sm text-deep-green dark:text-card disabled:opacity-60"
        />
        <p className="mt-1 font-body text-xs text-slate-500 dark:text-slate-400">
          Total number of staff scheduled per day.
        </p>
      </div>

      <div>
        <label className="block font-body text-sm font-medium text-deep-green dark:text-card mb-1">
          Hourly Compensation ($)
        </label>
        <input
          type="number"
          disabled
          placeholder="14.50"
          step="0.01"
          className="w-full max-w-xs rounded border border-deep-green/20 dark:border-card/20 bg-white dark:bg-dark-bg px-3 py-2 text-sm text-deep-green dark:text-card disabled:opacity-60"
        />
        <p className="mt-1 font-body text-xs text-slate-500 dark:text-slate-400">
          Hourly wage paid to each staff member.
        </p>
      </div>

      <SaveContinueButton />
    </div>
  )
}

function AmenitiesSection() {
  return (
    <div className="space-y-4">
      {[
        { label: 'Amenities Per Order ($)', placeholder: '2.50' },
        { label: 'Entertainment Budget ($)', placeholder: '800' },
        { label: 'Maintenance Budget ($)', placeholder: '500' },
      ].map(({ label, placeholder }) => (
        <div key={label}>
          <label className="block font-body text-sm font-medium text-deep-green dark:text-card mb-1">
            {label}
          </label>
          <input
            type="number"
            disabled
            placeholder={placeholder}
            step="0.01"
            className="w-full max-w-xs rounded border border-deep-green/20 dark:border-card/20 bg-white dark:bg-dark-bg px-3 py-2 text-sm text-deep-green dark:text-card disabled:opacity-60"
          />
        </div>
      ))}

      <SaveContinueButton />
    </div>
  )
}

function FinanceSection() {
  return (
    <div className="space-y-6">
      {/* Management Information */}
      <div className="space-y-3">
        <h3 className="font-heading text-base font-semibold text-deep-green dark:text-card">
          Management Information
        </h3>
        <p className="font-body text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          ⚠ Open Question OQ-3: Report flag field order unconfirmed.
        </p>
        {['Guest Satisfaction Report', 'Financial Report', 'Product Report'].map((label) => (
          <label
            key={label}
            className="flex items-center gap-3 font-body text-sm text-deep-green dark:text-card cursor-not-allowed"
          >
            <input
              type="checkbox"
              disabled
              className="h-4 w-4 rounded border-deep-green/30 dark:border-card/30 disabled:opacity-60"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Finance */}
      <div className="space-y-3">
        <h3 className="font-heading text-base font-semibold text-deep-green dark:text-card">
          Finance
        </h3>
        {[
          'Time Deposit Change',
          'Certificate of Deposit Change',
          'Note Payable Change',
        ].map((label) => (
          <div key={label}>
            <label className="block font-body text-sm font-medium text-deep-green dark:text-card mb-1">
              {label}
            </label>
            <input
              type="number"
              disabled
              defaultValue={0}
              className="w-full max-w-xs rounded border border-deep-green/20 dark:border-card/20 bg-white dark:bg-dark-bg px-3 py-2 text-sm text-deep-green dark:text-card disabled:opacity-60"
            />
          </div>
        ))}
      </div>

      <SaveContinueButton />
    </div>
  )
}

function SaveContinueButton() {
  return (
    <div className="pt-2 space-y-2">
      <Button variant="primary" disabled>
        Save and continue
      </Button>
      <p className="font-body text-xs text-slate-500 dark:text-slate-400">
        Saving will be enabled in Phase 3.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section registry
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { id: 'menu', label: 'Menu', complete: false, count: '0/8' },
  { id: 'staffing', label: 'Staffing & Compensation', complete: false },
  { id: 'amenities', label: 'Amenities & Upkeep', complete: false },
  { id: 'finance', label: 'Management & Finance', complete: false },
] as const

type SectionId = typeof NAV_ITEMS[number]['id']

const SECTION_COMPONENTS: Record<SectionId, React.FC> = {
  menu: MenuSection,
  staffing: StaffingSection,
  amenities: AmenitiesSection,
  finance: FinanceSection,
}

const SECTION_TITLES: Record<SectionId, string> = {
  menu: 'Menu',
  staffing: 'Staffing & Compensation',
  amenities: 'Amenities & Upkeep',
  finance: 'Management & Finance',
}

// ---------------------------------------------------------------------------
// DecisionsPage
// ---------------------------------------------------------------------------

/**
 * Multi-section decision entry page.
 * Placeholder UI — no actual form saving (enabled in Phase 3).
 */
export function DecisionsPage() {
  const { teamName, roundNumber } = useDevPreview()
  const [activeId, setActiveId] = useState<SectionId>('menu')

  const ActiveSection = SECTION_COMPONENTS[activeId]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enter Decisions"
        subtitle={`Round ${roundNumber} · ${teamName}`}
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Left sidebar */}
        <aside className="w-full shrink-0 md:w-56">
          <SectionNav
            items={NAV_ITEMS as unknown as { id: string; label: string; complete: boolean; count?: string }[]}
            activeId={activeId}
            onSelect={(id) => setActiveId(id as SectionId)}
          />
        </aside>

        {/* Right panel */}
        <div className="w-full min-w-0 flex-1">
          <Card>
            <h2 className="font-heading text-xl font-semibold text-deep-green dark:text-card mb-4">
              {SECTION_TITLES[activeId]}
            </h2>
            <ActiveSection />
          </Card>
        </div>
      </div>
    </div>
  )
}
