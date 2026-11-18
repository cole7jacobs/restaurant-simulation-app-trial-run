import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { LeaderboardEntry } from '../../shared/results'
import { App } from '../../src/App'
import { demoQ7Key } from '../../src/lib/demo'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

const account = { userId: 1, name: 'Student', role: 'student', teamId: 1, teamName: 'Bistro' }
const entry = (TeamName: string, FirmNumber: number, RoundNumber: number, NetIncome: number, Revenue: number, OperatingProfit: number, IsOwn = false): LeaderboardEntry =>
  ({ TeamName, FirmNumber, IsOwn, RoundNumber, NetIncome, Revenue, OperatingProfit })

function renderLeaderboard(path: string, rows: LeaderboardEntry[] = []) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/session') return Response.json({ account, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    if (url === '/api/student/leaderboard') return Response.json({ rows })
    throw new Error(`Unexpected request to ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  return fetchMock
}
const names = () => within(screen.getByRole('table', { name: /leaderboard/ })).getAllByRole('rowheader').map((cell) => cell.textContent)

it('shows the Leaderboard tab, game to date totals, the own team highlighted, and re-ranks by view', async () => {
  renderLeaderboard('/student/leaderboard', [
    entry('Alpha', 1, 4, 100, 5, 10), entry('Bistro', 2, 4, 50, 40, 2, true), entry('Cafe', 3, 4, 10, 20, 60),
    entry('Alpha', 1, 5, 200, 5, 10), entry('Bistro', 2, 5, 150, 10, 3, true), entry('Cafe', 3, 5, 90, 10, 30),
  ])
  const user = userEvent.setup()
  expect(await screen.findByRole('link', { name: 'Leaderboard' })).toBeVisible()
  expect(await screen.findByRole('table', { name: 'Overall leaderboard' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Game to date' })).toHaveAttribute('aria-pressed', 'true')
  expect(names()).toEqual(['1. Alpha', '2. Bistro (you)', '3. Cafe'])
  expect(screen.getByRole('row', { name: /Bistro/ })).toHaveAttribute('aria-current', 'true')
  expect(screen.getByRole('row', { name: /Alpha/ })).not.toHaveAttribute('aria-current')
  expect(screen.getByRole('img', { name: /^Cumulative net income by quarter/ })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Revenue' }))
  expect(names()).toEqual(['2. Bistro (you)', '3. Cafe', '1. Alpha'])
  expect(screen.getByRole('img', { name: /^Cumulative revenue by quarter/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Operating profit' }))
  expect(names()).toEqual(['3. Cafe', '1. Alpha', '2. Bistro (you)'])
  expect(screen.getByRole('row', { name: /Bistro/ })).toHaveAttribute('aria-current', 'true')
})

it('shows a single quarter without a chart, and a message for a quarter that is not imported', async () => {
  renderLeaderboard('/student/leaderboard', [
    entry('Alpha', 1, 4, 100, 5, 10), entry('Bistro', 2, 4, 50, 40, 2, true),
    entry('Alpha', 1, 5, 10, 5, 10), entry('Bistro', 2, 5, 150, 10, 3, true),
  ])
  const user = userEvent.setup()
  await screen.findByRole('table', { name: 'Overall leaderboard' })
  await user.click(screen.getByRole('button', { name: 'Q5' }))
  expect(names()).toEqual(['2. Bistro (you)', '1. Alpha'])
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Q4' }))
  expect(names()).toEqual(['1. Alpha', '2. Bistro (you)'])
  await user.click(screen.getByRole('button', { name: 'Q6' }))
  expect(screen.getByText('No results for Q6 yet.')).toBeVisible()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})

it('shows an empty state with no buttons before anything is imported', async () => {
  renderLeaderboard('/student/leaderboard', [])
  expect(await screen.findByText('No results have been imported yet.')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Game to date' })).not.toBeInTheDocument()
})

it('shows the sample leaderboard for Q1 to Q6 in demo mode, with Q7 empty, and never calls the API', async () => {
  const fetchMock = renderLeaderboard('/demo/student/leaderboard')
  const user = userEvent.setup()
  expect(await screen.findByText(/Sample data\./)).toBeVisible()
  expect(names()).toEqual(['1. Demo Bistro (you)', '2. Demo Grill', '4. Demo Kitchen', '3. Demo Cafe', '5. Demo Tavern'])
  expect(screen.getByRole('row', { name: /Demo Bistro/ })).toHaveAttribute('aria-current', 'true')
  expect(screen.getByRole('row', { name: /Demo Bistro/ })).toHaveTextContent('$234,133')
  expect(screen.getByRole('img', { name: /^Cumulative net income by quarter/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Q6' }))
  expect(screen.getByRole('row', { name: /Demo Bistro/ })).toHaveTextContent('$32,333')
  await user.click(screen.getByRole('button', { name: 'Q7' }))
  expect(screen.getByText('No results for Q7 yet.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Revenue' }))
  await user.click(screen.getByRole('button', { name: 'Game to date' }))
  expect(names()).toEqual(['1. Demo Bistro (you)', '5. Demo Tavern', '3. Demo Cafe', '2. Demo Grill', '4. Demo Kitchen'])
  expect(fetchMock).not.toHaveBeenCalled()
})

it('adds an imported Q7 for all five firms to the demo game to date totals', async () => {
  const firm = (n: number, NetIncome: number) => ({ firm: n, metrics: { FoodSales: 600, BeverageSales: 400, OperatingProfit: 7, NetIncome } })
  sessionStorage.setItem(demoQ7Key, JSON.stringify({ round: 7, metrics: {}, menu: [],
    firms: [firm(1, 10), firm(2, 20), firm(3, 30), firm(4, 40), firm(5, 500000)] }))
  const fetchMock = renderLeaderboard('/demo/student/leaderboard')
  const user = userEvent.setup()
  await screen.findByText(/Sample data\./)
  expect(names()[0]).toBe('5. Demo Tavern')
  expect(screen.getByRole('row', { name: /Demo Tavern/ })).toHaveTextContent('$530,665')
  await user.click(screen.getByRole('button', { name: 'Q7' }))
  expect(names()).toEqual(['5. Demo Tavern', '4. Demo Kitchen', '3. Demo Cafe', '2. Demo Grill', '1. Demo Bistro (you)'])
  expect(fetchMock).not.toHaveBeenCalled()
})

it('says which quarters game to date includes: consecutive, with a gap, and after the demo Q7 import', async () => {
  const gapRows = [1, 2, 4].map((round) => entry('Alpha', 1, round, 1, 1, 1))
  renderLeaderboard('/student/leaderboard', gapRows)
  expect(await screen.findByText('Game to date: Q1, Q2 and Q4 included.')).toBeVisible()
  expect(screen.getByRole('img', { name: /^Cumulative net income by quarter \(Q1, Q2 and Q4 included\)/ })).toBeInTheDocument()
  cleanup()

  renderLeaderboard('/demo/student/leaderboard')
  expect(await screen.findByText(/Game to date: Q1 to Q6 included\./)).toBeVisible()
  cleanup()

  const firm = (n: number) => ({ firm: n, metrics: { FoodSales: 1, BeverageSales: 1, OperatingProfit: 1, NetIncome: 1 } })
  sessionStorage.setItem(demoQ7Key, JSON.stringify({ round: 7, metrics: {}, menu: [], firms: [1, 2, 3, 4, 5].map(firm) }))
  renderLeaderboard('/demo/student/leaderboard')
  expect(await screen.findByText(/Game to date: Q1 to Q7 included\./)).toBeVisible()
  cleanup()

  sessionStorage.removeItem(demoQ7Key)
  renderLeaderboard('/demo/student/leaderboard')
  expect(await screen.findByText(/Game to date: Q1 to Q6 included\./)).toBeVisible()
})
