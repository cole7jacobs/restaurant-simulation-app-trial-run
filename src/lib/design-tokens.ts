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
  primary: '#E0A94F',

  /** Deep green — text, outlines, selected tabs */
  deepGreen: '#1F3A2A',

  /** Light orange — card and panel backgrounds */
  card: '#FCEDE4',

  /** Soft orange — warnings and error messages */
  alert: '#D98B62',

  /** Dark mode — page background */
  darkBg: '#161616',

  /** Dark mode — card background */
  darkCard: '#242424',
} as const

/** Font family names matching the CSS @theme --font-* values */
export const fonts = {
  /** Bricolage Grotesque — headings and key numbers */
  heading: '"Bricolage Grotesque", Arial, sans-serif',

  /** Hanken Grotesk — body text, button labels, table text, labels */
  body: '"Hanken Grotesk", Arial, sans-serif',
} as const

export type ColorToken = keyof typeof colors
export type FontToken = keyof typeof fonts
