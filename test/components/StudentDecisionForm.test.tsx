import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { decisionFields, reportFields } from '../../shared/decisions'
import { App } from '../../src/App'

const account = { userId: 1, name: 'Student', role: 'student', teamId: 1, teamName: 'Bistro' }

function initialState() {
  return {
    catalog: [{ MenuItemID: 1, ItemName: 'STEAK', OrderSizeUnit: 'Gm.' }],
    values: Object.fromEntries([...decisionFields, ...reportFields].map(({ key }) => [key, 0])),
    menu: [] as unknown[],
    revision: null as string | null,
    submittedAt: null as string | null,
  }
}

function app(path = '/student/decisions') {
  return <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>
}

async function signedIn(path = '/student/decisions', handler?: (options: RequestInit) => Promise<Response>) {
  const state = initialState()
  let nextRevision = 0
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/auth/session') {
      return Response.json({ account, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
    }
    if (url === '/api/student/team') return Response.json({ team: { TeamID: 1, TeamName: 'Bistro', FirmNumber: 1 } })
    if (url === '/api/student/decisions/2') {
      if (options?.method === 'POST') {
        if (handler) return handler(options)
        const draft = JSON.parse(String(options.body))
        Object.assign(state, {
          values: draft.values, menu: draft.menu, revision: 'revision-' + ++nextRevision,
          submittedAt: draft.submit ? '2026-11-11T18:00:00Z' : null,
        })
        return Response.json({ revision: state.revision, submittedAt: state.submittedAt })
      }
      return Response.json(state)
    }
    throw new Error('Unexpected request to ' + url)
  })
  vi.stubGlobal('fetch', fetchMock)
  render(app(path))
  if (!path.includes('/home')) await screen.findByRole('heading', { name: path.includes('/review') ? 'Review Decisions' : 'Enter Decisions' })
  return { state, fetchMock }
}

function posts(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

it('saves into review, returns to editing, and explicitly submits and locks the round', async () => {
  const { state, fetchMock } = await signedIn()
  const user = userEvent.setup()
  for (const [index, prep] of [[1, 'Sirloin'], [2, 'Burger']] as const) {
    await user.click(screen.getByRole('button', { name: 'Add selection' }))
    const row = within(screen.getByRole('group', { name: 'Selection ' + index }))
    await user.selectOptions(row.getByLabelText('Item'), '1')
    await user.selectOptions(row.getByLabelText('Preparation'), prep)
    await user.type(row.getByLabelText('Portion (Gm.)'), '180')
    await user.type(row.getByLabelText('Promotion ($)'), '20')
    await user.type(row.getByLabelText('Price ($)'), '12.50')
  }
  await user.click(screen.getByRole('button', { name: 'Review & Submit' }))
  expect(await screen.findByRole('heading', { name: 'Review Decisions' })).toBeVisible()
  const firstPosts = posts(fetchMock)
  expect(JSON.parse(String(firstPosts[firstPosts.length - 1]?.[1]?.body)).submit).toBe(false)
  expect(screen.getByLabelText('Staff FTEs per day')).toHaveAttribute('readonly')
  await user.click(screen.getByRole('button', { name: 'Keep Editing' }))
  expect(screen.getByLabelText('Staff FTEs per day')).not.toHaveAttribute('readonly')
  await user.click(screen.getByRole('button', { name: 'Review & Submit' }))
  await screen.findByRole('heading', { name: 'Review Decisions' })
  await user.click(screen.getByRole('button', { name: 'Submit Decisions' }))
  expect(await screen.findByText('Decisions submitted.')).toBeVisible()
  expect(screen.getByText(/This round is locked/)).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Keep Editing' })).not.toBeInTheDocument()
  expect(state.menu).toMatchObject([{ MenuItemID: 1, PrepLevel: 2 }, { MenuItemID: 1, PrepLevel: 1 }])
  const requests = posts(fetchMock).map(([, options]) => JSON.parse(String(options?.body)))
  expect(requests.map((request) => request.submit)).toEqual([false, false, true])
  expect(requests.map((request) => request.revision)).toEqual([null, 'revision-1', 'revision-2'])
})

it('waits for unfinished menu rows and saves 1.2 seconds after the last edit', async () => {
  const { fetchMock } = await signedIn()
  vi.useFakeTimers()
  fireEvent.click(screen.getByRole('button', { name: 'Add selection' }))
  fireEvent.change(screen.getByLabelText('Staff FTEs per day'), { target: { value: '3' } })
  await act(async () => { vi.advanceTimersByTime(3000) })
  expect(posts(fetchMock)).toHaveLength(0)
  expect(screen.getByText(/Complete or remove unfinished/)).toBeVisible()

  fireEvent.click(screen.getByRole('button', { name: 'Remove selection 1' }))
  await act(async () => { vi.advanceTimersByTime(1199) })
  expect(posts(fetchMock)).toHaveLength(0)
  await act(async () => { vi.advanceTimersByTime(1) })
  expect(posts(fetchMock)).toHaveLength(1)
  expect(JSON.parse(String(posts(fetchMock)[0][1]?.body)).values.StaffPerDay).toBe(3)
  expect(screen.getByText('Draft saved')).toBeVisible()

  fireEvent.click(screen.getByRole('button', { name: 'Add selection' }))
  const row = within(screen.getByRole('group', { name: 'Selection 1' }))
  fireEvent.change(row.getByLabelText('Item'), { target: { value: '1' } })
  fireEvent.change(row.getByLabelText('Preparation'), { target: { value: '2' } })
  fireEvent.change(row.getByLabelText('Portion (Gm.)'), { target: { value: '180' } })
  fireEvent.change(row.getByLabelText('Promotion ($)'), { target: { value: '20' } })
  fireEvent.change(row.getByLabelText('Price ($)'), { target: { value: '12.50' } })
  await act(async () => { vi.advanceTimersByTime(1200) })
  expect(posts(fetchMock)).toHaveLength(2)
  expect(JSON.parse(String(posts(fetchMock)[1][1]?.body)).menu).toMatchObject([{ MenuItemID: 1, PrepLevel: 2 }])
})

it('keeps edits made during a save and sends the next revision in a later autosave', async () => {
  let resolveFirst!: (response: Response) => void
  let count = 0
  const { fetchMock } = await signedIn('/student/decisions', async () => {
    count += 1
    if (count === 1) return new Promise<Response>((resolve) => { resolveFirst = resolve })
    return Response.json({ revision: 'revision-2', submittedAt: null })
  })
  vi.useFakeTimers()
  fireEvent.change(screen.getByLabelText('Staff FTEs per day'), { target: { value: '3' } })
  await act(async () => { vi.advanceTimersByTime(1200) })
  expect(screen.getByText('Saving…')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Staff FTEs per day'), { target: { value: '4' } })
  await act(async () => { resolveFirst(Response.json({ revision: 'revision-1', submittedAt: null })) })
  expect(screen.getByLabelText('Staff FTEs per day')).toHaveValue(4)
  expect(screen.getByText('Unsaved changes')).toBeVisible()
  await act(async () => { vi.advanceTimersByTime(1200) })
  const requests = posts(fetchMock).map(([, options]) => JSON.parse(String(options?.body)))
  expect(requests).toHaveLength(2)
  expect(requests[1]).toMatchObject({ revision: 'revision-1', values: { StaffPerDay: 4 } })
  expect(screen.getByText('Draft saved')).toBeVisible()
})

it('shows save errors without losing values and allows a manual retry', async () => {
  let count = 0
  const { fetchMock } = await signedIn('/student/decisions', async () => {
    count += 1
    return count === 1
      ? Response.json({ error: 'This round has changed. Reload to see the saved decisions.' }, { status: 409 })
      : Response.json({ revision: 'revision-1', submittedAt: null })
  })
  fireEvent.change(screen.getByLabelText('Staff FTEs per day'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('This round has changed')
  expect(screen.getByLabelText('Staff FTEs per day')).toHaveValue(7)
  expect(screen.getByText('Unsaved changes')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
  expect(await screen.findByText('Draft saved')).toBeVisible()
  expect(posts(fetchMock)).toHaveLength(2)
})

it('supports old review URLs and focuses the tile linked from the dashboard', async () => {
  await signedIn('/student/review/?round=2')
  expect(screen.getByRole('button', { name: 'Open navigation menu' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main-content')
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  expect(document.title).toBe('Decisions · Restaurant Simulation')
  expect(screen.getByLabelText('Staff FTEs per day')).toHaveClass('min-h-11')
  expect(screen.queryByRole('link', { name: 'Review' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Submit Decisions' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Keep Editing' }))
  expect(screen.getByRole('heading', { name: 'Enter Decisions' })).toBeVisible()
  cleanup()

  await signedIn('/student/home')
  fireEvent.click(await screen.findByRole('link', { name: 'Reports' }))
  const section = await screen.findByRole('region', { name: 'Reports' })
  expect(section).toHaveFocus()
})

it('uses the same editor for browser-only preview drafts', async () => {
  window.localStorage.setItem('dev-preview-role', 'student')
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/session') return Response.json({ error: 'Not authenticated' }, { status: 401 })
    throw new Error('Preview must not request decision APIs')
  })
  vi.stubGlobal('fetch', fetchMock)
  render(app())
  expect(await screen.findByText(/Demo drafts stay in this browser/)).toBeVisible()
  expect(screen.getByLabelText('Decision round')).toHaveValue('3')
  fireEvent.change(screen.getByLabelText('Staff FTEs per day'), { target: { value: '8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
  expect(await screen.findByText('Draft saved')).toBeVisible()
  expect(JSON.parse(window.localStorage.getItem('restaurant-sim:preview:decisions:v1:3')!).values.StaffPerDay).toBe(8)
  cleanup()
  render(app())
  expect(await screen.findByLabelText('Staff FTEs per day')).toHaveValue(8)
  expect(fetchMock.mock.calls.every(([url]) => url === '/api/auth/session')).toBe(true)
})

it('reports a browser storage failure without discarding preview edits', async () => {
  window.localStorage.setItem('dev-preview-role', 'student')
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'Not authenticated' }, { status: 401 })))
  render(app())
  const field = await screen.findByLabelText('Staff FTEs per day')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError') })
  fireEvent.change(field, { target: { value: '8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save the demo draft in browser storage')
  expect(field).toHaveValue(8)
  expect(screen.getByRole('button', { name: 'Save Draft' })).toBeEnabled()
})
