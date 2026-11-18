import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'

function LocationProbe() {
  const { pathname, search, hash } = useLocation()
  return <output data-testid="location">{pathname + search + hash}</output>
}

function renderDemo(path = '/demo/professor/home') {
  const fetchMock = vi.fn(() => { throw new Error('Demo must not call the API') })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App /><LocationProbe />
  </MemoryRouter>)
  return fetchMock
}

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  vi.unstubAllGlobals()
})

it('shows the professor tools together and keeps the navigation drawer accessible', async () => {
  document.body.style.overflow = 'auto'
  const fetchMock = renderDemo()
  const user = userEvent.setup()
  expect(screen.getByRole('heading', { name: 'Professor Dashboard', level: 1 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Team Submissions', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'RFI Generation', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'FR.LST Import', level: 2 })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Generate RFI' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Preview results' })).toBeVisible()

  const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveAttribute('aria-controls', 'professor-navigation-drawer')
  await user.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(document.body.style.overflow).toBe('hidden')
  const dialog = screen.getByRole('dialog', { name: 'Professor menu' })
  const close = within(dialog).getByRole('button', { name: 'Close navigation menu' })
  expect(close).toHaveFocus()
  const nav = within(dialog).getByRole('navigation', { name: 'Professor navigation' })
  await user.tab({ shift: true })
  expect(within(nav).getByRole('link', { name: 'FR.LST Import' })).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveFocus()
  expect(document.body.style.overflow).toBe('auto')

  await user.click(trigger)
  fireEvent.click(screen.getByTestId('professor-navigation-scrim'))
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveFocus()

  await user.click(trigger)
  await user.click(within(screen.getByRole('navigation', { name: 'Professor navigation' })).getByRole('link', { name: 'RFI Generation' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/demo/professor/home#rfi')
  expect(trigger).toHaveFocus()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('keeps older professor section URLs working', async () => {
  renderDemo('/demo/professor/import?source=link')
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/demo/professor/home?source=link#import'))
  expect(screen.getByRole('heading', { name: 'FR.LST Import' })).toBeVisible()
})
