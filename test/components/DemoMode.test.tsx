import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'
import { parseListing } from '../../worker/fr-lst'
import { demoKey, demoQ7Key } from '../../src/lib/demo'

function openDemo(path = '/demo') {
  const fetchMock = vi.fn(() => { throw new Error('Demo must not call the API') })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  return fetchMock
}
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals() })

it('opens public demo, displays Q5 results, and never calls protected APIs', async () => {
  const fetchMock = openDemo()
  expect(await screen.findByText('Demo Bistro · Q5')).toBeVisible()
  expect(screen.getByText('Demo Mode · Team 1: Demo Bistro')).toBeVisible()
  expect(screen.getByText('Demo Mode · Team 1: Demo Bistro').compareDocumentPosition(screen.getByRole('navigation', { name: 'Student navigation' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Student View' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Professor View' })).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(screen.getByRole('link', { name: 'Results' }))
  expect(await screen.findByRole('button', { name: 'Q5' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByText('$25,932')[1]).toBeVisible()
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Changes stay in this browser and do not recalculate results; the FORTRAN simulation runs externally. Q5 results are sample data; Q7 results come from the file you import.')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('saves edits only in demo session storage and resets them', async () => {
  const fetchMock = openDemo('/demo/student/decisions')
  const user = userEvent.setup()
  const field = await screen.findByLabelText('Staff FTEs per day')
  expect(field).toHaveValue(27)
  await user.clear(field); await user.type(field, '30')
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem(demoKey(5)) || '{}').values?.StaffPerDay).toBe(30), { timeout: 3000 })
  await user.click(screen.getByRole('button', { name: 'Reset Demo' }))
  expect(sessionStorage.getItem(demoKey(5))).toBeNull()
  await user.click(screen.getByRole('link', { name: 'Decisions' }))
  expect(await screen.findByLabelText('Staff FTEs per day')).toHaveValue(27)
  expect(fetchMock).not.toHaveBeenCalled()
})

const archived = import.meta.glob<string>('../../input-output/06_Q7-decisions/output-of-simulation/FR.LST', { eager: true, query: '?raw', import: 'default' })
it.skipIf(!Object.keys(archived).length)('parses the authentic local Q7 listing for all five firms', () => {
  const listing = parseListing(Object.values(archived)[0])
  expect(listing.round).toBe(7)
  expect(listing.firms.map(({ firm }) => firm)).toEqual([1, 2, 3, 4, 5])
})

const synthetic = (period: number) => [
  `Administrator's Summary; Example Period ${period}`,
  ...[1, 2, 3, 4, 5].flatMap((firm) => [
    `Firm ${firm} Example Period ${period}`, 'SALES * ASSETS',
    'Food Sales 786013. 78.62', 'Beverage Sales 213763. 21.38',
    'Food Cost 232756. 29.61', 'Beverage cost 44493. 20.81',
    'OPERATING PROFIT 141579. 14.16', 'NET INCOME or LOSS 25932. 2.59',
    'per Day & Training/Hr. per Order Orders per Order per Order Customer Count',
    '27.0 16.50 1.50 36100. 21.77 5.92 407.',
    'Selection Sales Purchase Order Internal Cost per Cost of Orders Total',
    'Price & Prep. Size Promotion unit of purchase Goods Sold Sold Sales',
    '     STEAK            24.95    Filet      170.0 Gm.        1750.       20.09 Kg.         28.7 %      5291.    132010.', '',
  ]),
  'Market Area   Affiliation', ...[1, 2, 3, 4, 5].map((firm) => `Firm ${firm} ME Example B1`),
].join('\r\n')

async function importQ7(source: string) {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Professor View' }))
  await user.click(screen.getByRole('link', { name: 'FR.LST Import' }))
  await user.upload(screen.getByLabelText('FR.LST file'), new File([source], 'sample.lst', { type: 'text/plain' }))
  await user.click(screen.getByRole('button', { name: 'Preview results' }))
  return user
}

it('imports Q7 into browser session, maps Firm 1, preserves Q5 and resets', async () => {
  const source = Object.values(archived)[0] ?? synthetic(7)
  const firm = parseListing(source).firms.find((item) => item.firm === 1)!
  const fetchMock = openDemo('/demo/student/results')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: /Q7, no results/ }))
  expect(screen.getByText('No results available for Quarter 7. The professor has not imported the simulation results yet.')).toBeVisible()
  await importQ7(source)
  expect(await screen.findByText('Firm 1 · Demo Bistro')).toBeVisible()
  expect(screen.getByText('Q7 results for 5 teams')).toBeVisible()
  expect(sessionStorage.getItem(demoQ7Key)).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Confirm import' }))
  expect(await screen.findByText(/Q7 results imported for Demo Bistro/)).toBeVisible()
  expect(JSON.parse(sessionStorage.getItem(demoQ7Key)!).metrics).toEqual(firm.metrics)
  await user.click(screen.getByRole('button', { name: 'Student View' }))
  await user.click(screen.getByRole('link', { name: 'Results' }))
  expect(await screen.findByText('Q7 · Demo Bistro')).toBeVisible()
  expect(screen.getByRole('table', { name: 'Q7 income statement amounts' })).toHaveTextContent(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(firm.metrics.NetIncome))
  await user.click(screen.getByRole('button', { name: 'Q5' }))
  expect(screen.getAllByText('$25,932')[1]).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Reset Demo' }))
  expect(sessionStorage.getItem(demoQ7Key)).toBeNull()
  await user.click(screen.getByRole('link', { name: 'Results' }))
  await user.click(await screen.findByRole('button', { name: /Q7, no results/ }))
  expect(screen.getByText('No results available for Quarter 7. The professor has not imported the simulation results yet.')).toBeVisible()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('shows all quarters but blocks unsupported demo imports', async () => {
  const fetchMock = openDemo('/demo/professor/import')
  const user = userEvent.setup()
  const select = screen.getByLabelText('Simulation round')
  for (let round = 1; round <= 7; round++) expect(screen.getByRole('option', { name: `Q${round}` })).toBeInTheDocument()
  await user.selectOptions(select, '5')
  await user.upload(screen.getByLabelText('FR.LST file'), new File([synthetic(7)], 'sample.lst'))
  await user.click(screen.getByRole('button', { name: 'Preview results' }))
  expect(screen.getByRole('alert')).toHaveTextContent('supports imports for Q7 only')
  expect(sessionStorage.getItem(demoQ7Key)).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('clears imported Q7 when leaving demo mode', async () => {
  sessionStorage.setItem(demoQ7Key, JSON.stringify({ round: 7, metrics: {}, menu: [] }))
  openDemo()
  await userEvent.click(await screen.findByRole('button', { name: 'Exit Demo' }))
  expect(sessionStorage.getItem(demoQ7Key)).toBeNull()
})

it('accepts a dropped Q7 file without uploading it', async () => {
  const fetchMock = openDemo('/demo/professor/import')
  const file = new File([synthetic(7)], 'FR.LST', { type: 'text/plain' })
  fireEvent.drop(screen.getByLabelText('FR.LST file').closest('label')!, { dataTransfer: { files: [file] } })
  await userEvent.click(screen.getByRole('button', { name: 'Preview results' }))
  expect(await screen.findByText('Firm 1 · Demo Bistro')).toBeVisible()
  expect(fetchMock).not.toHaveBeenCalled()
})

it.each([['invalid', 'invalid listing'], ['wrong period', synthetic(5)]])('rejects %s Q7 uploads without saving', async (_label, source) => {
  const fetchMock = openDemo()
  await importQ7(source)
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(sessionStorage.getItem(demoQ7Key)).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('allows adding and removing menu selections and generates a local sample RFI', async () => {
  const fetchMock = openDemo('/demo/student/decisions')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Add selection' }))
  expect(screen.getByText('Selection 2')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Remove selection 2' }))
  expect(screen.queryByText('Selection 2')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Professor View' }))
  await user.click(screen.getByRole('link', { name: 'RFI Generation' }))
  const createObjectURL = vi.fn(() => 'blob:demo')
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await user.click(screen.getByRole('button', { name: 'Generate RFI' }))
  expect(await screen.findByText(/Sample RFI download started/)).toBeVisible()
  expect(createObjectURL).toHaveBeenCalledOnce()
  click.mockRestore()
  expect(fetchMock).not.toHaveBeenCalled()
})
