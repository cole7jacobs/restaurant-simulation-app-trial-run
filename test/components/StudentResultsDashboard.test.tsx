import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { StudentResults } from '../../shared/results'
import { App } from '../../src/App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const account = { userId: 1, name: 'Student', role: 'student', teamId: 1, teamName: 'Bistro' }

function results(round: number, overrides: Partial<StudentResults['metrics']> = {}, menu?: StudentResults['menu']) {
  return {
    round,
    metrics: {
      TeamID: 1, RoundNumber: round,
      FoodSales: 786013, BeverageSales: 213763, FoodCost: 232756, BeverageCost: 44493,
      OperatingProfit: 141579, NetIncome: 25932, FoodOrders: 36100, AvgDailyCustomerCount: 407,
      ...overrides,
    },
    menu: menu ?? [
      { TeamID: 1, RoundNumber: round, ResultSlot: 1, MenuItemID: 1, ItemName: 'STEAK', PrepLevel: 3,
        DecisionSlot: null, CostOfGoodsSoldPct: 28.7, OrdersSold: 5291, TotalSales: 132010 },
      { TeamID: 1, RoundNumber: round, ResultSlot: 2, MenuItemID: 1, ItemName: 'STEAK', PrepLevel: 1,
        DecisionSlot: 2, CostOfGoodsSoldPct: 35.5, OrdersSold: 1200, TotalSales: 15000 },
    ],
  }
}

/** Stubs fetch with per-round responses; rounds that are not listed return the API's 404. */
function renderDashboard(rounds: Record<number, () => Response | Promise<Response>>) {
  const fetchMock = vi.fn(async (path: string) => {
    if (path === '/api/auth/session') {
      return Response.json({ account, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    }
    const match = /^\/api\/student\/results\/([1-7])$/.exec(path)
    if (!match) throw new Error(`Unexpected request to ${path}`)
    return rounds[Number(match[1])]?.() ??
      Response.json({ error: 'No imported results for this round.' }, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={['/student/results']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  return fetchMock
}

it('shows a loading state, then the latest imported round with metrics, menu results, and trends', async () => {
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  const fetchMock = renderDashboard({
    2: async () => { await held; return Response.json(results(2, { NetIncome: -4100 })) },
    5: () => Response.json(results(5)),
  })
  expect(await screen.findByText('Loading results…')).toBeVisible()
  release()

  expect(await screen.findByRole('button', { name: 'Q5' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText('Q5 · Bistro')).toBeVisible()
  expect(screen.queryByText('Loading results…')).not.toBeInTheDocument()
  for (const round of [1, 2, 3, 4, 5, 6, 7]) {
    expect(fetchMock).toHaveBeenCalledWith(`/api/student/results/${round}`, expect.anything())
  }

  const summary = within(screen.getByRole('table', { name: 'Q5 income statement amounts' }))
  expect(within(summary.getByRole('row', { name: /Food sales/ })).getByText('$786,013')).toBeVisible()
  expect(within(summary.getByRole('row', { name: /Net income/ })).getByText('$25,932')).toBeVisible()
  expect(screen.getByText('36,100')).toBeVisible()
  expect(screen.getByText('407')).toBeVisible()

  const menu = within(screen.getByRole('table', { name: 'Q5 menu-item results' }))
  const filet = within(menu.getByRole('row', { name: /Filet/ }))
  expect(filet.getByText('5,291')).toBeVisible()
  expect(filet.getByText('$132,010')).toBeVisible()
  expect(filet.getByText('28.7%')).toBeVisible()
  expect(menu.getByRole('row', { name: /Burger/ })).toBeVisible()
  expect(menu.queryByText(/price/i)).not.toBeInTheDocument()

  const orders = within(screen.getByRole('list', { name: 'Q5 orders sold by menu item' }))
  expect(orders.getAllByRole('listitem')).toHaveLength(2)
  const trend = within(screen.getByRole('list', { name: 'Net income by round' }))
  expect(trend.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Q2-$4,100', 'Q5$25,932'])
})

it('switches rounds and reports a round that has no imported results', async () => {
  renderDashboard({
    1: () => Response.json(results(1, { FoodSales: 500000 })),
    5: () => Response.json(results(5)),
  })
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Q1' }))
  expect(screen.getByRole('button', { name: 'Q1' })).toHaveAttribute('aria-pressed', 'true')
  const summary = within(screen.getByRole('table', { name: 'Q1 income statement amounts' }))
  expect(summary.getByText('$500,000')).toBeVisible()

  await user.click(screen.getByRole('button', { name: 'Q3, no results' }))
  expect(screen.getByText('No results for Q3')).toBeVisible()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})

it('shows an empty state when no round has been imported', async () => {
  renderDashboard({})
  expect(await screen.findByText('No results yet')).toBeVisible()
  expect(screen.queryByRole('group', { name: 'Simulation round' })).not.toBeInTheDocument()
})

it('explains when a round has metrics but no menu-item results', async () => {
  renderDashboard({ 4: () => Response.json(results(4, {}, [])) })
  expect(await screen.findByText('Menu-item results are not available for this round.')).toBeVisible()
  expect(screen.getByRole('table', { name: 'Q4 income statement amounts' })).toBeVisible()
  expect(screen.queryByRole('table', { name: 'Q4 menu-item results' })).not.toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Net income by round' })).not.toBeInTheDocument()
})

it('reports an API failure and loads results after a retry', async () => {
  let failing = true
  renderDashboard({
    5: () => failing
      ? Response.json({ error: 'The service is temporarily unavailable.' }, { status: 503 })
      : Response.json(results(5)),
  })
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load your results.')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  failing = false
  await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('table', { name: 'Q5 income statement amounts' })).toBeVisible()
})

it('returns to sign-in when the session has expired', async () => {
  renderDashboard({ 5: () => Response.json({ error: 'Session expired or invalid. Sign in again.' }, { status: 401 }) })
  expect(await screen.findByRole('button', { name: /sign in/i })).toBeVisible()
  expect(screen.queryByText('Loading results…')).not.toBeInTheDocument()
})
