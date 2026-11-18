import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'
import { demoKey } from '../../src/lib/demo'

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
  expect(screen.getByText('Demo Mode · Q5 · Demo Bistro')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Student View' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Professor View' })).toHaveAttribute('aria-pressed', 'false')
  await userEvent.click(screen.getByRole('link', { name: 'Results' }))
  expect(await screen.findByRole('button', { name: 'Q5' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByText('$25,932')[1]).toBeVisible()
  expect(screen.getByText(/do not recalculate results/)).toBeVisible()
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

it('switches to professor and previews and confirms fictional results locally', async () => {
  const fetchMock = openDemo()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Professor View' }))
  expect(await screen.findByText('Professor Dashboard')).toBeVisible()
  expect(screen.getByText('Demo Mode · Q5 · Demo Bistro')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Professor View' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Student View' })).toHaveAttribute('aria-pressed', 'false')
  await user.click(screen.getAllByRole('link', { name: 'FR.LST Import' })[0])
  await user.click(screen.getByRole('button', { name: 'Preview results' }))
  expect(await screen.findByText(/Fictional sample figures/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Confirm import' }))
  expect(await screen.findByText(/No file or results were saved/)).toBeVisible()
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
