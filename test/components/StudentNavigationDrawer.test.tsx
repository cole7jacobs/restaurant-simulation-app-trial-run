import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { App } from '../../src/App'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  vi.unstubAllGlobals()
})

it('opens the student drawer, traps focus, and restores focus and scrolling on close', async () => {
  document.body.style.overflow = 'auto'
  const fetchMock = vi.fn(() => { throw new Error('Demo must not call the API') })
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={['/demo/student/home']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter>)
  const user = userEvent.setup()
  const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
  expect(trigger).toHaveTextContent('')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveAttribute('aria-controls', 'student-navigation-drawer')
  await user.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(document.body.style.overflow).toBe('hidden')
  const dialog = screen.getByRole('dialog', { name: 'Student navigation' })
  const close = within(dialog).getByRole('button', { name: 'Close navigation menu' })
  const nav = within(dialog).getByRole('navigation', { name: 'Student navigation' })
  expect(close).toHaveFocus()
  await user.tab({ shift: true })
  expect(within(nav).getByRole('link', { name: 'Results' })).toHaveFocus()
  await user.tab()
  expect(close).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveFocus()
  expect(document.body.style.overflow).toBe('auto')

  await user.click(trigger)
  fireEvent.click(screen.getByTestId('student-navigation-scrim'))
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(trigger).toHaveFocus()

  await user.click(trigger)
  await user.click(within(screen.getByRole('navigation', { name: 'Student navigation' })).getByRole('link', { name: 'Decisions' }))
  expect(await screen.findByRole('heading', { name: 'Enter Decisions' })).toBeVisible()
  expect(trigger).toHaveFocus()
  expect(fetchMock).not.toHaveBeenCalled()
})
