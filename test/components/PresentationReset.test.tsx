import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('requires confirmation and shows success only in the local presentation environment', async () => {
  const request = vi.fn(async (url: string) => {
    if (url === '/api/auth/session') return Response.json({ account: { userId: 1, name: 'Professor', role: 'professor', teamId: null, teamName: null }, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    if (url === '/api/professor/submissions') return Response.json({ submissions: [] })
    if (url === '/api/professor/presentation/status') return Response.json({ available: true })
    if (url === '/api/professor/presentation/reset') return Response.json({ status: 'ok' })
    throw new Error('Unexpected request')
  })
  vi.stubGlobal('fetch', request)
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
  render(<MemoryRouter initialEntries={['/professor/home']}><App /></MemoryRouter>)
  const button = await screen.findByRole('button', { name: 'Reset Presentation' })
  await userEvent.click(button)
  expect(request).not.toHaveBeenCalledWith('/api/professor/presentation/reset', expect.anything())
  await userEvent.click(button)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Presentation reset'))
  expect(confirm).toHaveBeenCalledTimes(2)
})
