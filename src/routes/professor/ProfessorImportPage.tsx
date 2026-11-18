import { demoQ7Key } from '../../lib/demo'
import { parseListing, ListingError } from '../../../worker/fr-lst'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../context/AuthContext'
import { menuPreparations } from '../../../shared/decisions'
import { importRounds, maxListingSize, type ImportPreview } from '../../../shared/results'

const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

export function ProfessorImportPage({ demo = false }: { demo?: boolean }) {
  const { expire } = useAuth()
  const [round, setRound] = useState(demo ? '7' : '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [replace, setReplace] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function resetPreview() {
    setPreview(null)
    setReplace(false)
    setMessage('')
    setError('')
  }

  async function send(action: 'preview' | 'confirm') {
    if (demo) {
      if (action === 'confirm') {
        if (!preview) return
        const firm = preview.teams.find((team) => team.FirmNumber === 1)
        if (!firm) { setError('Firm 1 is missing from the preview.'); return }
        try {
          sessionStorage.setItem(demoQ7Key, JSON.stringify({ round: 7, metrics: firm.metrics,
            menu: firm.menu.map((row, index) => ({ ...row, ResultSlot: index + 1, DecisionSlot: null })) }))
          setPreview({ ...preview, alreadyImported: true })
          setMessage('Q7 results imported for Demo Bistro in this browser session. Switch to Student View and open Results.')
        } catch { setError('Unable to save the results in this browser session.') }
        return
      }
      setError(''); setMessage(''); setPreview(null)
      if (!file || !/\.lst$/i.test(file.name) || !file.size || file.size > maxListingSize) {
        setError('Choose a nonempty .LST file no larger than 256 KiB.'); return
      }
      setBusy(true)
      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Unable to read the file.'))
          reader.readAsText(file, 'utf-8')
        })
        const listing = parseListing(text)
        if (listing.round !== 7) throw new ListingError(`The file reports Q${listing.round}; select a Period 7 file.`)
        setPreview({ round: 7, token: '', alreadyImported: false, replacesResults: false, warnings: [],
          teams: listing.firms.map(({ firm, metrics, menu }) => ({ TeamID: -firm, FirmNumber: firm,
            TeamName: firm === 1 ? 'Demo Bistro' : `Firm ${firm}`, metrics,
            menu: menu.map((row) => ({ ...row, DecisionSlot: null })) })) })
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to process the listing.') }
      finally { setBusy(false) }
      return
    }
    if (!file || !round || busy) return
    setError('')
    setMessage('')
    if (action === 'preview') setPreview(null)
    if (!/\.lst$/i.test(file.name) || !file.size || file.size > maxListingSize) {
      setError('Choose a nonempty .LST file no larger than 256 KiB.')
      return
    }
    const form = new FormData()
    form.set('file', file)
    if (action === 'confirm' && preview) {
      form.set('token', preview.token)
      if (replace) form.set('replace', 'yes')
    }
    setBusy(true)
    try {
      const response = await fetch(`/api/professor/import/${round}/${action}`, { method: 'POST', body: form })
      if (response.status === 401) {
        expire()
        return
      }
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? 'Unable to process the listing.')
        if (response.status === 409) setPreview(null)
        return
      }
      setPreview(action === 'confirm' ? { ...result, alreadyImported: true, replacesResults: false } : result)
      setReplace(false)
      if (action === 'confirm') {
        setMessage(response.status === 201
          ? `Imported Q${round} results for ${result.teams.length} teams. All records passed validation.`
          : `Q${round} results were already imported.`)
      }
    } catch {
      setError('Unable to process the listing. Try again.')
    } finally {
      setBusy(false)
    }
  }

  function onPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send('preview')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Import Simulation Results" />
      <Card>
        <form onSubmit={onPreview} className="space-y-4">
          <fieldset disabled={busy} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-medium">Simulation round
              <select className="rounded border border-deep-green/30 bg-card/50 px-2 py-2 dark:bg-dark-card"
                required value={round} onChange={(event) => { resetPreview(); setRound(event.target.value) }}>
                <option value="">Choose round</option>
                {(demo ? [7] : importRounds).map((period) => <option key={period} value={period}>Q{period}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium" onDragOver={demo ? (event) => event.preventDefault() : undefined}
              onDrop={demo ? (event) => { event.preventDefault(); resetPreview(); setFile(event.dataTransfer.files[0] ?? null) } : undefined}>FR.LST file
              <input type="file" accept=".lst" required onChange={(event) => {
                resetPreview()
                setFile(event.target.files?.[0] ?? null)
              }} />
            </label>
            {demo && file && <span className="text-sm">Selected: {file.name}</span>}
            <Button type={demo ? "button" : "submit"} onClick={demo ? () => void send('preview') : undefined} disabled={busy || !round || !file}>Preview results</Button>
          </fieldset>
          <p className="text-sm">{demo ? 'Choose or drop a Period 7 FR.LST file. Your results stay in this browser session.' : 'The period printed in the file must match the selected round.'}</p>
        </form>
      </Card>
      {busy && <p role="status">Processing FR.LST…</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {preview && (
        <Card>
          <h2 className="mb-3 font-heading text-xl font-extrabold">Q{preview.round} results for {preview.teams.length} teams</h2>
          {preview.teams.map((team) => (
            <details key={team.TeamID} className="border-b border-deep-green/15 py-3 dark:border-card/15">
              <summary className="cursor-pointer">
                <strong>Firm {team.FirmNumber} · {team.TeamName}</strong>
                <span className="ml-2 text-sm">Net income {amount.format(team.metrics.NetIncome)} · {team.menu.length} menu results</span>
              </summary>
              <dl className="my-3 grid gap-2 text-sm sm:grid-cols-2">
                {([
                  ['Food sales', team.metrics.FoodSales], ['Beverage sales', team.metrics.BeverageSales],
                  ['Food cost', team.metrics.FoodCost], ['Beverage cost', team.metrics.BeverageCost],
                  ['Operating profit', team.metrics.OperatingProfit], ['Net income', team.metrics.NetIncome],
                  ['Food orders', team.metrics.FoodOrders], ['Average daily customers', team.metrics.AvgDailyCustomerCount],
                ] as const).map(([label, value]) => <div key={label}><dt className="inline font-medium">{label} </dt><dd className="inline">{amount.format(value)}</dd></div>)}
              </dl>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr>
                    {['Menu selection', 'Preparation', 'COGS %', 'Orders sold', 'Total sales'].map((label) =>
                      <th key={label} scope="col" className="p-2">{label}</th>)}
                  </tr></thead>
                  <tbody>{team.menu.map((row, index) => (
                    <tr key={index}>
                      <th scope="row" className="p-2 font-medium">{row.ItemName}</th>
                      <td className="p-2">{menuPreparations[row.ItemName]?.[row.PrepLevel - 1]}</td>
                      <td className="p-2">{amount.format(row.CostOfGoodsSoldPct)}</td>
                      <td className="p-2">{amount.format(row.OrdersSold)}</td>
                      <td className="p-2">{amount.format(row.TotalSales)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </details>
          ))}
          {preview.warnings.length > 0 && (
            <ul className="my-4 list-disc space-y-1 pl-5 text-sm">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          )}
          {preview.alreadyImported ? (
            !message && <p className="mt-4">This file has already been imported for Q{preview.round}.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {preview.replacesResults && <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={replace} disabled={busy} onChange={(event) => setReplace(event.target.checked)} />
                Replace the existing results for the listed teams in Q{preview.round}
              </label>}
              <Button disabled={busy || (preview.replacesResults && !replace)} onClick={() => void send('confirm')}>
                Confirm import
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
