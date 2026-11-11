import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../src/context/AuthContext'
import { ProfessorRFIPage } from '../../src/routes/professor/RFIPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('selects a round, shows submission status, and downloads the submitted team file', async () => {
  const fetchMock = vi.fn(async (path: string) => {
    if (path === '/api/auth/session') return Response.json({}, { status: 401 })
    if (path === '/api/professor/rfi/2') return Response.json({ teams: [] })
    if (path === '/api/professor/rfi/5') return Response.json({ teams: [
      { TeamID: 1, TeamName: 'Bistro', FirmNumber: 1, SubmittedAt: '2026-11-11', HasDecisions: 1 },
      { TeamID: 2, TeamName: 'Grill', FirmNumber: 2, SubmittedAt: null, HasDecisions: 1 },
    ] })
    if (path === '/api/professor/rfi/5/1') return new Response('Finance\r\n', {
      headers: { 'Content-Disposition': 'attachment; filename="RFI1ME.TXT"' },
    })
    throw new Error(`Unexpected API request: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('RFI1ME.TXT')
    expect(this.getAttribute('href')).toBe('blob:test')
  })
  const objectUrl = vi.fn(() => 'blob:test')
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: objectUrl, revokeObjectURL: vi.fn() }))
  const user = userEvent.setup()
  render(<AuthProvider><ProfessorRFIPage /></AuthProvider>)
  await user.selectOptions(screen.getByLabelText('Simulation round'), '5')
  expect(await screen.findByRole('button', { name: 'Generate RFI for Grill' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Generate RFI for Bistro' }))
  expect(await screen.findByText('Download started for RFI1ME.TXT.')).toBeVisible()
  expect(objectUrl).toHaveBeenCalledOnce()
  expect(click).toHaveBeenCalledOnce()
})
