/**
 * Dev Preview Mode utilities.
 *
 * Stores the currently previewed role in localStorage so it persists
 * across page reloads during development. No network calls are made;
 * this is entirely client-side.
 *
 * Key: 'dev-preview-role'  Values: 'student' | 'professor' | (absent)
 */

export type DevRole = 'student' | 'professor' | null

export interface DevPreviewState {
  role: DevRole
  teamName: string
  roundNumber: number
}

export const DEV_PREVIEW_TEAM = 'Team Alpha'
export const DEV_PREVIEW_ROUND = 3

const STORAGE_KEY = 'dev-preview-role'

/** Returns the current dev-preview state from localStorage. */
export function getDevPreview(): DevPreviewState {
  const raw = localStorage.getItem(STORAGE_KEY)
  const role: DevRole =
    raw === 'student' || raw === 'professor' ? raw : null

  return {
    role,
    teamName: DEV_PREVIEW_TEAM,
    roundNumber: DEV_PREVIEW_ROUND,
  }
}

/** Persists the chosen role to localStorage. */
export function setDevPreview(role: DevRole): void {
  if (role === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, role)
  }
}

/** Removes all dev-preview state from localStorage. */
export function clearDevPreview(): void {
  localStorage.removeItem(STORAGE_KEY)
}
