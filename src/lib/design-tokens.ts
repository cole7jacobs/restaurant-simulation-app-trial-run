/**
 * Design tokens — JavaScript constants mirroring the CSS @theme values.
 *
 * These are used in:
 *   - Unit tests to verify token values haven't drifted
 *   - Recharts configuration (chart colors are set via props, not CSS classes)
 *   - Any runtime code that needs color values as strings
 *
 * Source: ISDS 4125 Project — Architectural Diagram and Design System (v1, 2026-10-30)
 */

/** Brand colors (hex strings matching the CSS @theme tokens exactly) */
export const colors = {
  /** Gold — main buttons (Save and continue, Submit), chart bars */
  primary: '#6D8F8F',

  /** Deep green — text, outlines, selected tabs */
  deepGreen: '#2B2E2E',

  /** Light orange — card and panel backgrounds */
  card: '#E6EEEC',

  /** Soft orange — warnings and error messages */
  alert: '#6D8F8F',

  /** Dark mode — page background */
  darkBg: '#2B2E2E',

  /** Dark mode — card background */
  darkCard: '#FFFFFF12',
} as const

/** Font family names matching the CSS @theme --font-* values */
export const fonts = {
  /** Big Shoulders Display — headings and key numbers */
  heading: '"Big Shoulders Display", "Arial Narrow", sans-serif',

  /** Hanken Grotesk — body text, button labels, table text, labels */
  body: '"Hanken Grotesk", Arial, sans-serif',
} as const

export type ColorToken = keyof typeof colors
export type FontToken = keyof typeof fonts
