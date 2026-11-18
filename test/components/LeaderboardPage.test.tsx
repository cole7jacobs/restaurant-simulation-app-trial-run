import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { LeaderboardEntry } from '../../shared/results'
import { App } from '../../src/App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const account = { userId: 1, name: 'Student', role: 'student', teamId: 1, teamName: 'Bistro' }
const entry = (TeamName: string, FirmNumber: number, NetIncome: number, Revenue: number, OperatingProfit: number, IsOwn = false): LeaderboardEntry =>
  ({ TeamName, FirmNumber, IsOwn, NetIncome, Revenue, OperatingProfit })

function renderLeaderboard(path: string, teams: LeaderboardEntry[] = []) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/session') return Response.json({ account, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    if (url === '/api/student/leaderboard') return Response.json({ teams })
    throw new Error(`Unexpected request to ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  return fetchMock
}

it('shows the Leaderboard tab with the own team highlighted and re-ranks by the chosen view', async () => {
  renderLeaderboard('/student/leaderboard', [
    entry('Alpha', 1, 300, 10, 20),
    entry('Bistro', 2, 200, 50, 5, true),
    entry('Cafe', 3, 100, 30, 90),
  ])
  const user = userEvent.setup()
  const names = () => within(screen.getByRole('table', { name: /leaderboard/ })).getAllByRole('rowheader').map((cell) => cell.textContent)

  expect(await screen.findByRole('link', { name: 'Leaderboard' })).toBeVisible()
  expect(await screen.findByRole('table', { name: 'Overall leaderboard' })).toBeVisible()
  expect(names()).toEqual(['1. Alpha', '2. Bistro (you)', '3. Cafe'])
  expect(screen.getByRole('row', { name: /Bistro/ })).toHaveAttribute('aria-current', 'true')
  expect(screen.getByRole('row', { name: /Alpha/ })).not.toHaveAttribute('aria-current')

  await user.click(screen.getByRole('button', { name: 'Revenue' }))
  expect(names()).toEqual(['2. Bistro (you)', '3. Cafe', '1. Alpha'])
  await user.click(screen.getByRole('button', { name: 'Operating profit' }))
  expect(names()).toEqual(['3. Cafe', '1. Alpha', '2. Bistro (you)'])
  expect(screen.getByRole('row', { name: /Bistro/ })).toHaveAttribute('aria-current', 'true')
})

it('shows only a note in demo mode and never calls the API', async () => {
  const fetchMock = renderLeaderboard('/demo/student/leaderboard')
  expect(await screen.findByText('The leaderboard is available when you are signed in.')).toBeVisible()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})
