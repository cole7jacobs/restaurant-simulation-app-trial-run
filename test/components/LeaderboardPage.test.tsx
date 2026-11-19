import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'

const teams = [
  { teamId: 1, teamName: 'Bistro', firmNumber: 1, netIncome: -20, operatingProfit: 400, foodSales: 10, beverageSales: 10 },
  { teamId: 2, teamName: 'Cafe', firmNumber: 2, netIncome: 100, operatingProfit: 20, foodSales: 500, beverageSales: 10 },
  { teamId: 3, teamName: 'Grill', firmNumber: 3, netIncome: 100, operatingProfit: -20, foodSales: 30, beverageSales: 10 },
  { teamId: 4, teamName: 'Kitchen', firmNumber: 4, netIncome: 0, operatingProfit: 30, foodSales: 70, beverageSales: 10 },
  { teamId: 5, teamName: 'Tavern', firmNumber: 5, netIncome: 20, operatingProfit: 40, foodSales: 90, beverageSales: 10 },
]
function setup(role: 'student' | 'professor') {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/session') return Response.json({ account: { userId: 1, name: 'User', role, teamId: role === 'student' ? 1 : null, teamName: role === 'student' ? 'Bistro' : null }, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    if (url === `/api/${role}/leaderboard/1`) return Response.json({ round: 1, teams })
    if (url === `/api/${role}/leaderboard/2`) return Response.json({ error: 'Not imported' }, { status: 404 })
    throw Error(`Unexpected ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={[`/${role}/leaderboard`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  return fetchMock
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function order() { return within(screen.getByRole('table', { name: 'Quarter 1 team leaderboard' })).getAllByRole('row').slice(1).map((row) => within(row).getByRole('rowheader').textContent) }

it('sorts each metric, breaks ties by firm, highlights the student, and hides unimported Q2', async () => {
  const request = setup('student'), user = userEvent.setup()
  await screen.findByRole('table', { name: 'Quarter 1 team leaderboard' })
  expect(order()).toEqual(['Cafe', 'Grill', 'Tavern', 'Kitchen', 'Bistro (You)'])
  expect(screen.getByRole('row', { name: /Bistro \(You\)/ })).toHaveTextContent('-$20.00')
  await user.selectOptions(screen.getByLabelText('Ranking metric'), 'revenue')
  expect(order()).toEqual(['Cafe', 'Tavern', 'Kitchen', 'Grill', 'Bistro (You)'])
  expect(screen.getByText(/Revenue is food sales plus beverage sales/)).toBeVisible()
  await user.selectOptions(screen.getByLabelText('Ranking metric'), 'operatingProfit')
  expect(order()).toEqual(['Bistro (You)', 'Tavern', 'Kitchen', 'Cafe', 'Grill'])
  await user.selectOptions(screen.getByLabelText('Simulation quarter'), '2')
  expect(await screen.findByText('Results for Quarter 2 have not been released yet.')).toBeVisible()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(request).toHaveBeenCalledWith('/api/student/leaderboard/2', expect.anything())
  await user.selectOptions(screen.getByLabelText('Simulation quarter'), '1')
  expect(await screen.findByRole('table', { name: 'Quarter 1 team leaderboard' })).toBeVisible()
})

it('uses the shared leaderboard for professors without marking a team as their own', async () => {
  setup('professor')
  await screen.findByRole('table', { name: 'Quarter 1 team leaderboard' })
  expect(order()).toContain('Bistro')
  expect(screen.queryByText(/\(You\)/)).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute('aria-current', 'page')
})
