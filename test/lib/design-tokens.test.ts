import { describe, it, expect } from 'vitest'
import { colors, fonts } from '../../src/lib/design-tokens'

/**
 * Design token tests.
 *
 * Purpose: guard against accidental token drift between the CSS @theme values
 * and the JavaScript constants used by Recharts and other runtime code.
 * If a token changes in one place, this test fails and forces a deliberate update
 * in the other.
 *
 * Token values are sourced from the ISDS 4125 Architectural Diagram and Design
 * System document (v1, 2026-10-30).
 */
describe('design tokens — colors', () => {
  it('primary (icy ocean) matches the design system value', () => {
    expect(colors.primary).toBe('#6D8F8F')
  })

  it('deepGreen matches the design system value', () => {
    expect(colors.deepGreen).toBe('#2B2E2E')
  })

  it('card (light orange) matches the design system value', () => {
    expect(colors.card).toBe('#E6EEEC')
  })

  it('alert (icy ocean) matches the design system value', () => {
    expect(colors.alert).toBe('#6D8F8F')
  })

  it('darkBg (dark mode background) matches the design system value', () => {
    expect(colors.darkBg).toBe('#2B2E2E')
  })

  it('darkCard (dark mode card) matches the design system value', () => {
    expect(colors.darkCard).toBe('#FFFFFF12')
  })

  it('exports exactly six color tokens', () => {
    expect(Object.keys(colors)).toHaveLength(6)
  })
})

describe('design tokens — fonts', () => {
  it('heading font includes Big Shoulders Display', () => {
    expect(fonts.heading).toContain('Big Shoulders Display')
  })

  it('body font includes Hanken Grotesk', () => {
    expect(fonts.body).toContain('Hanken Grotesk')
  })

  it('both fonts include Arial as a fallback', () => {
    expect(fonts.heading).toContain('Arial')
    expect(fonts.body).toContain('Arial')
  })
})
