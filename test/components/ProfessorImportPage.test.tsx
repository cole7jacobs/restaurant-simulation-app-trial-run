import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'

const account = { userId: 2, name: 'Professor', role: 'professor', teamId: null, teamName: null }
const preview = { round: 2, token: 'token', alreadyImported: false, replacesResults: false, warnings: ['Example warning'], teams: [1, 2, 3, 4, 5].map((firm) => ({ TeamID: firm, FirmNumber: firm, TeamName: `Team ${firm}`, metrics: { FoodSales: 1, BeverageSales: 1, FoodCost: 1, BeverageCost: 1, OperatingProfit: 1, NetIncome: 1, FoodOrders: 1, AvgDailyCustomerCount: 1 }, menu: [] })) }
function setup() {
  const request = vi.fn(async (url: string) => {
    if (url === '/api/auth/session') return Response.json({ account, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    if (url === '/api/professor/import/2/preview') return Response.json(preview)
    if (url === '/api/professor/import/2/confirm') return Response.json(preview, { status: 201 })
    if (url === '/api/professor/import/3/preview') return Response.json({ error: 'The file reports Q2, but you selected Q3.' }, { status: 422 })
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', request)
  render(<MemoryRouter initialEntries={['/professor/import']}><App /></MemoryRouter>)
  return request
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('selects and removes a file, previews five firms, and clears preview when the round changes', async () => {
  const request = setup(), user = userEvent.setup()
  const round = await screen.findByLabelText('Simulation round')
  for (let i = 1; i <= 7; i++) expect(screen.getByRole('option', { name: `Q${i}` })).toBeInTheDocument()
  await user.selectOptions(round, '2')
  await user.upload(screen.getByLabelText('FR.LST file'), new File(['example'], 'report.lst'))
  expect(screen.getByText('Selected: report.lst')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Preview results' }))
  expect(await screen.findByText('Q2 results for 5 teams')).toBeVisible()
  expect(screen.getByText('Example warning')).toBeVisible()
  expect(screen.getByText('Firm 1 · Team 1')).toBeVisible()
  await user.selectOptions(round, '3')
  expect(screen.queryByText('Q2 results for 5 teams')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Preview results' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('file reports Q2')
  await user.click(screen.getByRole('button', { name: 'Remove file' }))
  expect(screen.getByRole('button', { name: 'Preview results' })).toBeDisabled()
  expect(request).toHaveBeenCalledWith('/api/professor/import/3/preview', expect.anything())
})

it('accepts dropped files, rejects invalid input, and confirms a preview', async () => {
  setup(); const user = userEvent.setup()
  await user.selectOptions(await screen.findByLabelText('Simulation round'), '2')
  const zone = screen.getByLabelText('FR.LST file').closest('label')!
  fireEvent.dragEnter(zone, { dataTransfer: { files: [] } })
  expect(zone.className).toContain('border-primary')
  fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'bad.txt')] } })
  expect(screen.getByRole('alert')).toHaveTextContent('nonempty .LST')
  fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'FR.LST')] } })
  expect(screen.getByText('Selected: FR.LST')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Preview results' }))
  await user.click(await screen.findByRole('button', { name: 'Confirm import' }))
  expect(await screen.findByText(/Imported Q2 results for 5 teams/)).toBeVisible()
})
