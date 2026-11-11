import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { decisionFields, reportFields } from '../../shared/decisions'
import { App } from '../../src/App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('saves and reviews two preparations of the same item before submitting', async () => {
  const account = { userId: 1, name: 'Student', role: 'student', teamId: 1, teamName: 'Bistro' }
  const state = {
    catalog: [{ MenuItemID: 1, ItemName: 'STEAK', OrderSizeUnit: 'Gm.' }],
    values: Object.fromEntries([...decisionFields, ...reportFields].map(({ key }) => [key, 0])),
    menu: [],
    revision: null,
    submittedAt: null,
  }
  const fetchMock = vi.fn(async (path: string, options?: RequestInit) => {
    if (path === '/api/auth/session') {
      return Response.json({ account, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    }
    if (path === '/api/student/decisions/2') {
      if (options?.method === 'POST') {
        const draft = JSON.parse(String(options.body))
        Object.assign(state, {
          values: draft.values, menu: draft.menu, revision: 'saved',
          submittedAt: draft.submit ? '2026-11-11T18:00:00Z' : null,
        })
      }
      return Response.json(state)
    }
    throw new Error(`Unexpected request to ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/student/decisions']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)

  for (const [index, prep] of [[1, 'Sirloin'], [2, 'Burger']] as const) {
    await user.click(await screen.findByRole('button', { name: 'Add selection' }))
    const row = within(screen.getByRole('group', { name: `Selection ${index}` }))
    await user.selectOptions(row.getByLabelText('Item'), '1')
    await user.selectOptions(row.getByLabelText('Preparation'), prep)
    await user.type(row.getByLabelText('Portion (Gm.)'), '180')
    await user.type(row.getByLabelText('Promotion ($)'), '20')
    await user.type(row.getByLabelText('Price ($)'), '12.50')
  }
  await user.click(screen.getByRole('button', { name: 'Save draft' }))
  await user.click(await screen.findByRole('link', { name: 'Review saved decisions' }))
  expect(await screen.findByRole('heading', { name: 'Review Decisions' })).toBeVisible()
  await user.click(await screen.findByRole('button', { name: 'Submit decisions' }))
  expect(await screen.findByText('Decisions submitted.')).toBeVisible()
  expect(state.menu).toMatchObject([{ MenuItemID: 1, PrepLevel: 2 }, { MenuItemID: 1, PrepLevel: 1 }])
})
