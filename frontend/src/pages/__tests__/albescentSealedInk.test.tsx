/**
 * The sealed page's eyebrow is TEXT, and text is painted from a NAMED tier (#2523).
 *
 * SEAM: the ink-role declarations `AlbescentSecretPlaceholder` emits, read
 * through `utils/__tests__/inkSeam.ts` so there is one definition of "what
 * counts as an ink" and not a second copy here.
 *
 * WHY THIS SEAM AND NOT A CONTRAST ROW. `factionContrast.test.ts` measures
 * TOKEN PAIRINGS, and it already pins `--faction-default-card-muted` on
 * `--faction-default-card-bg` in both themes. Its equivalent row was live the
 * whole time the eyebrow was failing at 1.92:1, because the eyebrow was not
 * painted from a token at all: it was an inline `color-mix()` at 30%, a tier the
 * register did not name. No value-level sweep can reach a per-site mix, which is
 * precisely how this surface stayed unmeasured. The missing assertion was never
 * "is the muted tier legible" but "does the text on this page read a tier at
 * all", and that is a question about what the component emits.
 *
 * THE TIERS ARE na's SINCE #2632. The page's private vellum register is deleted
 * — owner ruling, the white aesthetic is purged and Albescent takes the na sheet
 * — so this file measures the same shape against the card family. The page stays
 * FLAT (no `.alb-prism`): it is the un-revealed view by definition, and the
 * prism arrives with the reveal.
 *
 * THE FLEUR AND THE RULE ARE ORNAMENT AND ARE MEANT TO STAY WHISPERS
 * (owner ruling on #2523). They are `ink(22)` and `ink(16)` and they owe no
 * ratio; keeping them exactly where they are is what makes the eyebrow's
 * promotion a statement about that one line rather than a flat lift of the whole
 * page. The guard below is written so that it forbids a fourth TEXT tier while
 * asserting both ornaments still carry their own alpha — a sweep that "fixed"
 * this page by lifting everything would go red here, and so would one that
 * deleted the ornament to satisfy the first half.
 *
 * The ornament exemption is structural, not a listed escape hatch: the fleur is
 * an `aria-hidden` `<svg>` whose `color` exists only to feed
 * `fill="currentColor"`, so the whole element is cut out of the markup before
 * the text inks are read. A future ornament drawn the same way is covered; a
 * future `color-mix()` on a paragraph is not.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'

import '../../i18n'
import { declarations, INK_PROPS } from '../../utils/__tests__/inkSeam'
import AlbescentSecretPlaceholder from '../AlbescentSecretPlaceholder'

const html = renderToStaticMarkup(<AlbescentSecretPlaceholder />)

/** The page with its ornament cut out: the `aria-hidden` fleur-de-lis. */
const textMarkup = html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/g, '')

const textInks = declarations(textMarkup)
  .filter(([property]) => INK_PROPS.has(property))
  .map(([, value]) => value)

/** The three ink tiers the na card names, and the three `factionContrast` measures. */
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

  /**
   * The eyebrow — `— no such account —`, the page's actual claim, the only line
   * that says what happened. Asserted by its tier rather than by its copy: the
   * wording has already moved once (#2409 redacted "SEALED" away) and a
   * copy-anchored guard would have rotted with it.
   */
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
