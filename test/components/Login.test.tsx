import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../src/App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('account sign-in', () => {
  it.each(['student', 'professor'] as const)('opens the dashboard assigned to a %s account', async (role) => {
    const account = {
      userId: 1, name: 'Test Account', role,
      teamId: role === 'student' ? 1 : null,
      teamName: role === 'student' ? 'Assigned Bistro' : null,
    }
    const fetchMock = vi.fn(async (path: string) => {
      switch (path) {
        case '/api/auth/session':
          return Response.json({ error: 'Sign in required.' }, { status: 401 })
        case '/api/auth/login':
          return Response.json({ account, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
        case '/api/student/team':
          return Response.json({ team: { TeamID: 1, TeamName: 'Assigned Bistro', FirmNumber: 1 } })
        case '/api/professor/submissions':
          return Response.json({ submissions: [] })
        case '/api/auth/logout':
          return new Response(null, { status: 204 })
        default:
          throw new Error(`Unexpected API request ${path}`)
      }
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)

    await user.type(screen.getByLabelText('Email'), 'test@example.invalid')
    await user.type(screen.getByLabelText('Password'), 'test-input-only')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { name: role === 'student' ? 'Welcome back' : 'Professor Dashboard' })).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      body: JSON.stringify({ email: 'test@example.invalid', password: 'test-input-only' }),
    }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeVisible()
  })

  it('prompts the user to sign in again after an invalid session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(
      { error: 'Session expired or invalid. Sign in again.' }, { status: 401 },
    )))
    render(<MemoryRouter initialEntries={['/professor/home']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Your session expired.')
    expect(screen.queryByRole('heading', { name: 'Professor Dashboard' })).toBeNull()
  })
})
