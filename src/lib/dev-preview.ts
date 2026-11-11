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
  let raw: string | null = null
  if (import.meta.env.DEV) {
    try {
      raw = window.localStorage?.getItem(STORAGE_KEY) ?? null
    } catch {
      // Preview still works for the current page when storage is disabled.
    }
  }
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
  if (!import.meta.env.DEV) return
  try {
    if (role === null) window.localStorage?.removeItem(STORAGE_KEY)
    else window.localStorage?.setItem(STORAGE_KEY, role)
  } catch {
    // Persistence is optional for development preview.
  }
}
