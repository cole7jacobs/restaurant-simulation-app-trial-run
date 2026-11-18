import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useOutletContext, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth, useProtectedData } from '../../context/AuthContext'
import { useDevPreview } from '../../context/DevPreviewContext'
import { isDemoPath } from '../../lib/demo'
import { loadPreviewDecision, savePreviewDecision } from '../../lib/preview-decisions'
import {
  decisionFields, decisionRounds, financeFields, menuPreparations, menuSlots, reportFields,
  type DecisionResponse, type DecisionValues, type MenuSelection,
} from '../../../shared/decisions'

const inputClass = 'mt-1 min-h-11 w-full rounded-md border border-deep-green/30 bg-card/70 px-2 py-2 dark:border-card/30 dark:bg-dark-bg'
const emptyMenu = { MenuItemID: '', PrepLevel: '', OrderSize: '', InternalPromotion: '', SalesPrice: '' }
type MenuInput = typeof emptyMenu
type SaveIntent = 'auto' | 'manual' | 'review' | 'submit'

const staffKeys = ['StaffPerDay', 'HourlyCompensation']
const amenityKeys = ['AmenitiesPerOrder', 'EntertainmentBudget', 'MaintenanceBudget']
const financeKeys: readonly string[] = financeFields

function Editor({ initial, round, initialReview, preview, onRoundChange }: {
  initial: DecisionResponse
  round: number
  initialReview: boolean
  preview: boolean
  onRoundChange: (round: string) => void
}) {
  const { expire } = useAuth()
  const { actionTarget } = useOutletContext<{ actionTarget: HTMLDivElement | null }>()
  const { hash, pathname } = useLocation()
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(initial.values).map(([key, value]) => [key, value === null ? '' : String(value)]),
  ))
  const [menu, setMenu] = useState<MenuInput[]>(() => initial.menu.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value)])) as MenuInput,
  ))
  const [revision, setRevision] = useState(initial.revision)
  const [submittedAt, setSubmittedAt] = useState(initial.submittedAt)
  const [reviewing, setReviewing] = useState(initialReview)
  const [saving, setSaving] = useState<SaveIntent | null>(null)
  const [dirty, setDirty] = useState(false)
  const [autoBlocked, setAutoBlocked] = useState(false)
  const [error, setError] = useState('')
  const editVersion = useRef(0)
  const savingRef = useRef(false)
  const tilesRef = useRef<HTMLDivElement>(null)
  const readOnly = reviewing || Boolean(submittedAt)
  const incompleteMenu = menu.some((row) => Object.values(row).some((value) => value === ''))

  useEffect(() => {
    const tiles = tilesRef.current
    const pane = tiles?.closest<HTMLElement>('[data-decision-scroll]')
    if (!tiles || !pane || typeof ResizeObserver === 'undefined') return
    const cards = Array.from(tiles.querySelectorAll<HTMLElement>('.decision-tile'))
    const clearMeasurements = () => {
      tiles.style.removeProperty('--stack-pane-height')
      cards.forEach((card) => {
        card.style.removeProperty('--stack-card-height')
        card.style.removeProperty('--stack-top')
      })
    }
    const measure = () => {
      if (!pane.clientHeight) {
        clearMeasurements()
        return
      }
      tiles.style.setProperty('--stack-pane-height', `${pane.clientHeight}px`)
      cards.forEach((card) => {
        if (card.offsetHeight) {
          card.style.setProperty('--stack-card-height', `${card.offsetHeight}px`)
          if (card.offsetHeight + 12 > pane.clientHeight) card.style.setProperty('--stack-top', 'auto')
          else card.style.removeProperty('--stack-top')
        } else {
          card.style.removeProperty('--stack-card-height')
          card.style.removeProperty('--stack-top')
        }
      })
    }
    let observer: ResizeObserver | undefined
    try {
      const currentObserver = new ResizeObserver(measure)
      observer = currentObserver
      currentObserver.observe(pane)
      cards.forEach((card) => currentObserver.observe(card))
      measure()
      return () => {
        currentObserver.disconnect()
        clearMeasurements()
      }
    } catch {
      observer?.disconnect()
      clearMeasurements()
    }
  }, [])

  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(hash.slice(1))
    if (!target) return
    target.scrollIntoView?.({ block: 'start' })
    target.focus({ preventScroll: true })
  }, [hash])

  function changed() {
    editVersion.current += 1
    setDirty(true)
    setAutoBlocked(false)
  }

  function updateMenu(index: number, key: keyof MenuInput, value: string) {
    changed()
    setMenu((previous) => previous.map((row, position) => position !== index ? row : {
      ...row, [key]: value, ...(key === 'MenuItemID' ? { PrepLevel: '' } : {}),
    }))
  }

  const save = useCallback(async (intent: SaveIntent) => {
    if (savingRef.current || submittedAt) return
    if (incompleteMenu) {
      if (intent !== 'auto') setError('Complete or remove any unfinished menu selections before saving.')
      return
    }

    const version = editVersion.current
    const payload = {
      revision,
      submit: intent === 'submit',
      values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : Number(value)])) as DecisionValues,
      menu: menu.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as MenuSelection),
    }
    savingRef.current = true
    setSaving(intent)
    setError('')
    try {
      let result: { revision: string; submittedAt: string | null }
      if (preview) {
        result = savePreviewDecision(round, payload, isDemoPath(pathname))
      } else {
        const response = await fetch('/api/student/decisions/' + round, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (response.status === 401) {
          expire()
          return
        }
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error ?? 'Unable to save decisions.')
        result = body
      }
      setRevision(result.revision)
      setSubmittedAt(result.submittedAt)
      setDirty(editVersion.current !== version)
      setAutoBlocked(false)
      if (intent === 'review' && editVersion.current === version) setReviewing(true)
    } catch (caught) {
      setAutoBlocked(true)
      setError(caught instanceof DOMException
        ? 'Unable to save the demo draft in browser storage. Check storage access and try again.'
        : caught instanceof Error ? caught.message : 'Unable to save decisions. Try again.')
    } finally {
      savingRef.current = false
      setSaving(null)
    }
  }, [expire, incompleteMenu, menu, pathname, preview, revision, round, submittedAt, values])

  useEffect(() => {
    if (!dirty || incompleteMenu || saving || autoBlocked || readOnly) return
    const timer = window.setTimeout(() => void save('auto'), 1200)
    return () => window.clearTimeout(timer)
  }, [autoBlocked, dirty, incompleteMenu, readOnly, save, saving])

  const lockedForReviewSave = saving === 'review' || saving === 'submit'
  const roundLocked = dirty || Boolean(saving)
  const status = submittedAt ? 'Decisions submitted.' : saving ? 'Saving…'
    : dirty || revision === null ? 'Unsaved changes' : 'Draft saved'

  function fieldTile(id: string, title: string, keys: readonly string[]) {
    return (
      <section id={id} tabIndex={-1} aria-labelledby={id + '-title'} className="decision-tile">
        <h2 id={id + '-title'} className="mb-3 font-heading text-xl font-extrabold">{title}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {decisionFields.filter(({ key }) => keys.includes(key)).map(({ key, label, decimals }) => (
            <label key={key} className="text-sm font-medium">{label}
              <input className={inputClass} type="number" readOnly={readOnly || lockedForReviewSave}
                step={10 ** -decimals} min={financeKeys.includes(key) ? undefined : 0} value={values[key] ?? ''}
                onChange={(event) => {
                  changed()
                  setValues((previous) => ({ ...previous, [key]: event.target.value }))
                }} />
            </label>
          ))}
        </div>
      </section>
    )
  }

  const actions = (
    <div className="decision-action-bar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 text-sm">
          <p role="status" aria-live="polite" className="font-semibold">{status}</p>
          {submittedAt && <p>Submitted {new Date(submittedAt).toLocaleString()}. This round is locked.</p>}
          {!submittedAt && incompleteMenu && <p>Complete or remove unfinished menu selections to save.</p>}
          {!submittedAt && reviewing && revision !== null && <p>Submitting locks this round’s decisions.</p>}
          {!submittedAt && reviewing && revision === null && <p>Keep editing and save a draft before submitting.</p>}
          {error && <p role="alert" className="mt-1 font-semibold text-red-800 dark:text-red-200">{error}</p>}
        </div>
        {!submittedAt && (
          <div className="flex flex-wrap items-center gap-2">
            {reviewing ? (
              <>
                <Button type="button" variant="outlined" disabled={Boolean(saving)} onClick={() => setReviewing(false)}>Keep Editing</Button>
                <Button type="button" disabled={Boolean(saving) || revision === null} onClick={() => void save('submit')}>Submit Decisions</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outlined" disabled={Boolean(saving)} onClick={() => void save('manual')}>Save Draft</Button>
                <Button type="button" disabled={Boolean(saving)} onClick={() => void save('review')}>Review &amp; Submit</Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={readOnly ? 'Review Decisions' : 'Enter Decisions'}
        subtitle={preview ? 'Development preview · Demo drafts stay in this browser' : undefined}
      >
        <label className="grid gap-1 text-sm font-medium">Decision round
          <select className={inputClass} value={round} disabled={roundLocked} onChange={(event) => onRoundChange(event.target.value)}
            aria-describedby={roundLocked ? 'round-change-help' : undefined}>
            {decisionRounds.map((period) => <option key={period} value={period}>Q{period}</option>)}
          </select>
        </label>
      </PageHeader>
      {roundLocked && <p id="round-change-help" className="text-xs">Save your changes before changing rounds.</p>}
      {readOnly && !submittedAt && <p className="text-sm">Review your saved draft below. Select Keep Editing to make changes.</p>}
      <div ref={tilesRef} className="decision-tiles">
        <section id="menu" tabIndex={-1} aria-labelledby="menu-title" className="decision-tile decision-menu">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="menu-title" className="font-heading text-xl font-extrabold">Menu selections</h2>
            <span className="text-xs">{menu.length} / {menuSlots} selections</span>
          </div>
          {menu.length === 0 && <p className="mb-3 text-sm">No menu selections yet.</p>}
          <div className="space-y-3">
            {menu.map((row, index) => {
              const item = initial.catalog.find(({ MenuItemID }) => String(MenuItemID) === row.MenuItemID)
              const labels = item ? menuPreparations[item.ItemName] : undefined
              return (
                <fieldset key={index} disabled={lockedForReviewSave} className="rounded-lg border border-deep-green/30 p-3 dark:border-card/20">
                  <legend className="px-1 text-sm font-semibold">Selection {index + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="text-sm font-medium">Item
                      <select className={inputClass} value={row.MenuItemID} disabled={readOnly}
                        onChange={(event) => updateMenu(index, 'MenuItemID', event.target.value)}>
                        <option value="">Choose item</option>
                        {!item && row.MenuItemID && <option value={row.MenuItemID}>Unavailable catalog item</option>}
                        {initial.catalog.map((entry) => <option key={entry.MenuItemID} value={entry.MenuItemID}>{entry.ItemName}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-medium">Preparation
                      <select className={inputClass} value={row.PrepLevel} disabled={readOnly || !labels}
                        onChange={(event) => updateMenu(index, 'PrepLevel', event.target.value)}>
                        <option value="">Choose preparation</option>
                        {labels?.map((label, prep) => <option key={prep} value={prep + 1}>{label}</option>)}
                      </select>
                    </label>
                    {([
                      ['OrderSize', 'Portion' + (item ? ' (' + item.OrderSizeUnit + ')' : ''), '0.1'],
                      ['InternalPromotion', 'Promotion ($)', '1'],
                      ['SalesPrice', 'Price ($)', '0.01'],
                    ] as const).map(([key, label, step]) => (
                      <label key={key} className="text-sm font-medium">{label}
                        <input className={inputClass} type="number" min="0" step={step} value={row[key]} readOnly={readOnly}
                          onChange={(event) => updateMenu(index, key, event.target.value)} />
                      </label>
                    ))}
                  </div>
                  {!readOnly && <button type="button" className="mt-2 text-sm underline" onClick={() => {
                    changed()
                    setMenu((previous) => previous.filter((_, position) => position !== index))
                  }}>Remove selection {index + 1}</button>}
                </fieldset>
              )
            })}
          </div>
          {!readOnly && menu.length < menuSlots && <Button type="button" variant="outlined" className="mt-3"
            disabled={lockedForReviewSave} onClick={() => {
              changed()
              setMenu((previous) => [...previous, { ...emptyMenu }])
            }}>Add selection</Button>}
        </section>
        <div className="decision-column">
          {fieldTile('staffing', 'Staffing & Compensation', staffKeys)}
          {fieldTile('finance', 'Finance', financeKeys)}
        </div>
        <div className="decision-column">
          {fieldTile('amenities', 'Amenities & Upkeep', amenityKeys)}
          <section id="reports" tabIndex={-1} aria-labelledby="reports-title" className="decision-tile">
            <h2 id="reports-title" className="mb-3 font-heading text-xl font-extrabold">Reports</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {reportFields.map(({ key, label }) => (
                <label key={key} className="text-sm font-medium">{label}
                  <select className={inputClass} disabled={readOnly || lockedForReviewSave} value={values[key] ?? ''}
                    onChange={(event) => {
                      changed()
                      setValues((previous) => ({ ...previous, [key]: event.target.value }))
                    }}>
                    <option value="">Choose…</option>
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                  </select>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
      {actionTarget && createPortal(actions, actionTarget)}
    </div>
  )
}

function SignedInEditor({ round, initialReview, onRoundChange }: {
  round: number; initialReview: boolean; onRoundChange: (round: string) => void
}) {
  const { data, error } = useProtectedData<DecisionResponse>('/student/decisions/' + round)
  if (!data) return <p role={error ? 'alert' : 'status'}>{error ?? 'Loading decisions…'}</p>
  return <Editor initial={data} round={round} initialReview={initialReview} preview={false} onRoundChange={onRoundChange} />
}

function PreviewEditor({ round, initialReview, onRoundChange }: {
  round: number; initialReview: boolean; onRoundChange: (round: string) => void
}) {
  const { pathname } = useLocation()
  const [result] = useState(() => {
    try {
      return { data: loadPreviewDecision(round, isDemoPath(pathname)), error: '' }
    } catch {
      return { data: null, error: 'Unable to load the demo draft from browser storage. Check storage access and reload.' }
    }
  })
  if (!result.data) return <p role="alert">{result.error}</p>
  return <Editor initial={result.data} round={round} initialReview={initialReview} preview onRoundChange={onRoundChange} />
}

export function StudentDecisionForm({ review = false }: { review?: boolean }) {
  const { session } = useAuth()
  const { pathname } = useLocation()
  const demo = isDemoPath(pathname)
  const { roundNumber } = useDevPreview()
  const [search, setSearch] = useSearchParams()
  const requested = Number(search.get('round'))
  const fallback = demo ? 5 : session ? decisionRounds[0] : roundNumber
  const round = decisionRounds.includes(requested) ? requested : fallback
  const props = {
    round,
    initialReview: review,
    onRoundChange: (next: string) => setSearch((previous) => {
      const updated = new URLSearchParams(previous)
      updated.set('round', next)
      return updated
    }),
  }
  return session && !demo
    ? <SignedInEditor key={round + ':' + review} {...props} />
    : <PreviewEditor key={round + ':' + review} {...props} />
}
