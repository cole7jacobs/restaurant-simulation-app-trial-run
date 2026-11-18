import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

it('shows the professor tools as tiles without a navigation header', () => {
  const fetchMock = renderDemo()
  expect(screen.getByRole('heading', { name: 'Professor Dashboard', level: 1 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Team Submissions', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'RFI Generation', level: 2 })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'FR.LST Import', level: 2 })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Team Submissions' })).toHaveClass('professor-tile')
  expect(screen.getByRole('region', { name: 'RFI Generation' })).toHaveClass('professor-tile')
  expect(screen.getByRole('region', { name: 'FR.LST Import' })).toHaveClass('professor-tile')
  expect(screen.queryByText('Monitor teams, generate RFI files, and import simulation results from one place.')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Generate RFI' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Preview results' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Open navigation menu' })).not.toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Professor navigation' })).not.toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('keeps older professor section URLs working', async () => {
  renderDemo('/demo/professor/import?source=link')
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/demo/professor/home?source=link#import'))
  expect(screen.getByRole('heading', { name: 'FR.LST Import' })).toBeVisible()
})
