/**
 * The sealed page's text is painted from a NAMED tier (#2523), read via
 * `inkSeam.ts`. `factionContrast.test.ts` measures token pairs, so it could
 * not see the eyebrow's inline 30% `color-mix()`; this asserts what the
 * component emits. Tiers are na's since #2632.
 *
 * The fleur and rule stay ornament whispers (`ink(22)`, `ink(16)`, owner
 * ruling): no fourth text tier, and both ornaments keep their alpha. The
 * `aria-hidden` svg is cut out before text inks are read.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import '../../i18n'
import { declarations, INK_PROPS } from '../../utils/__tests__/inkSeam'
import AlbescentSecretPlaceholder from '../AlbescentSecretPlaceholder'

const html = renderToStaticMarkup(<AlbescentSecretPlaceholder />)

const textMarkup = html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g, '')

const textInks = declarations(textMarkup)
  .filter(([property]) => INK_PROPS.has(property))
  .map(([, value]) => value)

const NAMED_TIERS = new Set([
  'var(--faction-default-card-text)',
  'var(--faction-default-card-muted)',
  'var(--faction-default-card-accent)',
])

const wash = (percent: number) =>
  `color-mix(in srgb, var(--faction-default-card-text) ${percent}%, transparent)`

describe("the sealed page's text ink", () => {
  it('is a named card tier at every site, never a per-site fade', () => {
    expect(textInks.length).toBeGreaterThan(0)
    expect(textInks.filter((value) => !NAMED_TIERS.has(value))).toEqual([])
  })

  /** By tier, not copy: the wording already moved once (#2409). */
  it('reaches the muted tier for the eyebrow', () => {
    expect(textInks).toContain('var(--faction-default-card-muted)')
  })
})

describe("the sealed page's ornament", () => {
  it('keeps the fleur and the 64px rule at their own whisper alphas', () => {
    const all = declarations(html).map(([property, value]) => `${property}: ${value}`)
    expect(all).toContain(`color: ${wash(22)}`)
    expect(all).toContain(`background: ${wash(16)}`)
  })
})
