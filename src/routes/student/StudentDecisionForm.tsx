import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth, useProtectedData } from '../../context/AuthContext'
import {
  decisionFields, decisionRounds, financeFields, menuPreparations, menuSlots, reportFields,
  type DecisionResponse, type MenuSelection,
} from '../../../shared/decisions'

const inputClass = 'w-full rounded border border-deep-green/30 bg-white px-2 py-2 dark:border-card/30 dark:bg-dark-card'
const emptyMenu = { MenuItemID: '', PrepLevel: '', OrderSize: '', InternalPromotion: '', SalesPrice: '' }
type MenuInput = typeof emptyMenu

function Editor({ initial, round, review }: { initial: DecisionResponse; round: number; review: boolean }) {
  const { expire } = useAuth()
  const [values, setValues] = useState(() => Object.fromEntries(
    Object.entries(initial.values).map(([key, value]) => [key, value === null ? '' : String(value)]),
  ))
  const [menu, setMenu] = useState<MenuInput[]>(() => initial.menu.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value)])) as MenuInput,
  ))
  const [revision, setRevision] = useState(initial.revision)
  const [submittedAt, setSubmittedAt] = useState(initial.submittedAt)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const readOnly = review || Boolean(submittedAt)

  function updateMenu(index: number, key: keyof MenuInput, value: string) {
    setDirty(true)
    setMenu((previous) => previous.map((row, position) => position !== index ? row : {
      ...row, [key]: value, ...(key === 'MenuItemID' ? { PrepLevel: '' } : {}),
    }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || submittedAt) return
    setMessage('')
    setError('')
    if (menu.some((row) => Object.values(row).some((value) => value === ''))) {
      setError('Complete or remove any unfinished menu selections before saving.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch(`/api/student/decisions/${round}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revision, submit: review,
          values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : Number(value)])),
          menu: menu.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as MenuSelection),
        }),
      })
      if (response.status === 401) {
        expire()
        return
      }
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Unable to save decisions.')
        return
      }
      setRevision(result.revision)
      setSubmittedAt(result.submittedAt)
      setDirty(false)
      setMessage(review ? 'Decisions submitted.' : 'Draft saved.')
    } catch {
      setError('Unable to save decisions. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {submittedAt && <p role="status">Submitted {new Date(submittedAt).toLocaleString()}.</p>}
      <fieldset disabled={busy} className="space-y-6">
        <Card>
          <h2 className="mb-3 font-heading text-lg font-semibold">Menu selections</h2>
          {menu.length === 0 && <p className="mb-3 text-sm">No menu selections yet.</p>}
          <div className="space-y-4">
            {menu.map((row, index) => {
              const item = initial.catalog.find(({ MenuItemID }) => String(MenuItemID) === row.MenuItemID)
              const labels = item ? menuPreparations[item.ItemName] : undefined
              return (
                <fieldset key={index} className="rounded border border-deep-green/20 p-3 dark:border-card/20">
                  <legend className="px-1 font-medium">Selection {index + 1}</legend>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <label className="text-sm">Item
                      <select className={inputClass} value={row.MenuItemID} disabled={readOnly}
                        onChange={(event) => updateMenu(index, 'MenuItemID', event.target.value)}>
                        <option value="">Choose item</option>
                        {!item && row.MenuItemID && <option value={row.MenuItemID}>Unavailable catalog item</option>}
                        {initial.catalog.map((entry) => <option key={entry.MenuItemID} value={entry.MenuItemID}>{entry.ItemName}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">Preparation
                      <select className={inputClass} value={row.PrepLevel} disabled={readOnly || !labels}
                        onChange={(event) => updateMenu(index, 'PrepLevel', event.target.value)}>
                        <option value="">Choose preparation</option>
                        {labels?.map((label, prep) => <option key={prep} value={prep + 1}>{label}</option>)}
                      </select>
                    </label>
                    {([
                      ['OrderSize', `Portion${item ? ` (${item.OrderSizeUnit})` : ''}`, '0.1'],
                      ['InternalPromotion', 'Promotion ($)', '1'],
                      ['SalesPrice', 'Price ($)', '0.01'],
                    ] as const).map(([key, label, step]) => (
                      <label key={key} className="text-sm">{label}
                        <input className={inputClass} type="number" min="0" step={step} value={row[key]} readOnly={readOnly}
                          onChange={(event) => updateMenu(index, key, event.target.value)} />
                      </label>
                    ))}
                  </div>
                  {!readOnly && <button type="button" className="mt-2 text-sm underline" onClick={() => {
                    setDirty(true)
                    setMenu((previous) => previous.filter((_, position) => position !== index))
                  }}>Remove selection {index + 1}</button>}
                </fieldset>
              )
            })}
          </div>
          {!readOnly && menu.length < menuSlots && <Button type="button" variant="outlined" className="mt-3" onClick={() => {
            setDirty(true)
            setMenu((previous) => [...previous, { ...emptyMenu }])
          }}>Add selection</Button>}
        </Card>

        <Card>
          <h2 className="mb-3 font-heading text-lg font-semibold">Operations and finance</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {decisionFields.map(({ key, label, decimals }) => (
              <label key={key} className="text-sm">{label}
                <input className={inputClass} type="number" readOnly={readOnly} step={10 ** -decimals}
                  min={financeFields.some((field) => field === key) ? undefined : 0} value={values[key]}
                  onChange={(event) => {
                    setDirty(true)
                    setValues({ ...values, [key]: event.target.value })
                  }} />
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-heading text-lg font-semibold">Reports</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {reportFields.map(({ key, label }) => (
              <label key={key} className="text-sm">{label}
                <select className={inputClass} disabled={readOnly} value={values[key]} onChange={(event) => {
                  setDirty(true)
                  setValues({ ...values, [key]: event.target.value })
                }}>
                  <option value="">Choose…</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>
            ))}
          </div>
        </Card>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className="flex flex-wrap items-center gap-4">
        {!submittedAt && <Button type="submit" disabled={busy || (review && revision === null)}>
          {busy ? 'Saving…' : review ? 'Submit decisions' : 'Save draft'}
        </Button>}
        {review && <Link className="underline" to={`/student/decisions?round=${round}`}>Back to decisions</Link>}
        {!review && !dirty && revision !== null && <Link className="underline" to={`/student/review?round=${round}`}>Review saved decisions</Link>}
        {!review && dirty && <span className="text-sm">Save your changes before reviewing.</span>}
        {review && !submittedAt && revision !== null && <span className="text-sm">Submitting locks this round’s decisions.</span>}
      </div>
    </form>
  )
}

function LoadedEditor({ round, review }: { round: number; review: boolean }) {
  const { data, error } = useProtectedData<DecisionResponse>(`/student/decisions/${round}`)
  if (!data) return <p role={error ? 'alert' : 'status'}>{error ?? 'Loading decisions…'}</p>
  return <Editor initial={data} round={round} review={review} />
}

export function StudentDecisionForm({ review = false }: { review?: boolean }) {
  const [search, setSearch] = useSearchParams()
  const requested = Number(search.get('round'))
  const round = decisionRounds.includes(requested) ? requested : decisionRounds[0]

  return (
    <div className="space-y-6">
      <PageHeader title={review ? 'Review Decisions' : 'Enter Decisions'} />
      <label className="inline-grid gap-1 text-sm font-medium">Decision round
        <select className={inputClass} value={round} onChange={(event) => setSearch({ round: event.target.value })}>
          {decisionRounds.map((period) => <option key={period} value={period}>Q{period}</option>)}
        </select>
      </label>
      <LoadedEditor key={`${round}:${review}`} round={round} review={review} />
    </div>
  )
}
