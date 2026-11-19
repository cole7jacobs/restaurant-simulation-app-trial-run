import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'
import { demoArchive, demoKey } from '../../src/lib/demo'
import { parseListing } from '../../worker/fr-lst'

function openDemo(path = '/demo') {
  const fetchMock = vi.fn(() => { throw new Error('Demo must not call the API') })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  return fetchMock
}
afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals() })

const originals = import.meta.glob<string>('../../input-output/*/output-of-simulation/FR.LST', { eager: true, query: '?raw', import: 'default' })
it.skipIf(!Object.keys(originals).length)('matches the Q1–Q5 reference listings for all firms and menu results', () => {
  expect(demoArchive).toHaveLength(5)
  for (const period of demoArchive) {
    const source = Object.values(originals).find((text) => parseListing(text).round === period.round)!
    const actual = parseListing(source)
    expect(period.firms).toHaveLength(5)
    for (const firm of period.firms) {
      const expected = actual.firms.find((item) => item.firm === firm.firm)!
      expect(firm.metrics).toEqual(expected.metrics)
      expect(firm.menu).toEqual(expected.menu.map((row, index) => ({ ItemName: row.ItemName, PrepLevel: row.PrepLevel,
        CostOfGoodsSoldPct: row.CostOfGoodsSoldPct, OrdersSold: row.OrdersSold, TotalSales: row.TotalSales,
        ResultSlot: index + 1, DecisionSlot: null })))
    }
  }
})

it('opens directly to Q5 results with no login, API access, or professor controls', async () => {
  const fetchMock = openDemo()
  expect(await screen.findByRole('button', { name: 'Q5' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Q5 · Demo Bistro')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Professor View/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /FR.LST Import|RFI Generation/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Q6|Q7/ })).not.toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('denies direct demo professor URLs', async () => {
  const fetchMock = openDemo('/demo/professor/import')
  expect(await screen.findByText(/this page does not exist/i)).toBeVisible()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('shows authentic Q1–Q5 results and preserves selected quarter across navigation', async () => {
  const fetchMock = openDemo(), user = userEvent.setup()
  for (const period of demoArchive) {
    await user.click(await screen.findByRole('button', { name: `Q${period.round}` }))
    const table = screen.getByRole('table', { name: `Q${period.round} income statement amounts` })
    const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(period.firms[0].metrics.NetIncome)
    expect(within(table).getByRole('row', { name: /Net income/i })).toHaveTextContent(expected)
  }
  await user.click(screen.getByRole('button', { name: 'Q2' }))
  await user.click(screen.getByRole('link', { name: 'Leaderboard' }))
  await user.click(screen.getByRole('link', { name: 'Results' }))
  expect(await screen.findByRole('button', { name: 'Q2' })).toHaveAttribute('aria-pressed', 'true')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('shows all five real firms and matching metrics for Q1–Q5 and preserves leaderboard choices', async () => {
  const fetchMock = openDemo(), user = userEvent.setup()
  await user.click(await screen.findByRole('link', { name: 'Leaderboard' }))
  expect(await screen.findByRole('table', { name: 'Quarter 5 team leaderboard' })).toBeVisible()
  for (const period of demoArchive) {
    await user.selectOptions(screen.getByLabelText('Simulation quarter'), String(period.round))
    const table = await screen.findByRole('table', { name: `Quarter ${period.round} team leaderboard` })
    expect(within(table).getAllByRole('row')).toHaveLength(6)
    const expected = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(period.firms[0].metrics.NetIncome)
    expect(within(table).getByRole('row', { name: /Demo Bistro \(You\)/ })).toHaveTextContent(expected)
  }
  await user.selectOptions(screen.getByLabelText('Simulation quarter'), '2')
  await user.selectOptions(screen.getByLabelText('Ranking metric'), 'revenue')
  await user.click(screen.getByRole('link', { name: 'Results' }))
  await user.click(screen.getByRole('link', { name: 'Leaderboard' }))
  expect(await screen.findByRole('table', { name: 'Quarter 2 team leaderboard' })).toBeVisible()
  expect(screen.getByLabelText('Ranking metric')).toHaveValue('revenue')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('validates and saves Q5 drafts locally, keeps results fixed, and resets', async () => {
  const fetchMock = openDemo('/demo/student/decisions'), user = userEvent.setup()
  const field = await screen.findByLabelText('Staff FTEs per day')
  expect(field).toHaveValue(27)
  expect(screen.getByText('Selection 1')).toBeVisible()
  expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument()
  await user.clear(field); await user.type(field, '-1')
  await user.click(screen.getByRole('button', { name: 'Save Demo Draft' }))
  expect(await screen.findByRole('alert')).toBeVisible()
  await user.clear(field); await user.type(field, '30')
  await user.click(screen.getByRole('button', { name: 'Save Demo Draft' }))
  await waitFor(() => expect(JSON.parse(sessionStorage.getItem(demoKey(5)) || '{}').values?.StaffPerDay).toBe(30))
  await user.click(screen.getByRole('link', { name: 'Results' }))
  const table = await screen.findByRole('table', { name: 'Q5 income statement amounts' })
  expect(within(table).getByRole('row', { name: /Net income/i })).toHaveTextContent('$25,932')
  await user.click(screen.getByRole('button', { name: 'Reset Demo' }))
  expect(sessionStorage.getItem(demoKey(5))).toBeNull()
  await user.click(screen.getByRole('link', { name: 'Decisions' }))
  expect(await screen.findByLabelText('Staff FTEs per day')).toHaveValue(27)
  expect(fetchMock).not.toHaveBeenCalled()
})
