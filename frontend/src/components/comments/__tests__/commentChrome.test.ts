/**
 * THE SEAM (#2650, epic #2649): **a comment's chrome resolves from
 * `--faction-<key>-comment-*`, and a surface that is only chrome needs no
 * archetype file at all.**
 *
 * The rule has two halves and this file holds both.
 *
 *  1. A faction either REGISTERS a comment voice — it draws something a token
 *     cannot carry, and `frontend/src/components/comments/voices/` says in one
 *     line what — or it does not, and then the shared chassis paints it from a
 *     COMPLETE `--faction-<key>-comment-*` set. A half-declared set is the
 *     failure mode this catches: `var(--missing)` is not an error, it is an
 *     unstyled sheet nobody notices until the faction is on screen.
 *
 *  2. A tenth faction that registers nothing and declares nothing lands on
 *     `default` through `resolveCssKey`, so the `default` set being complete is
 *     what makes it render by construction. That is the property the whole epic
 *     is buying, asserted here rather than asserted in prose.
 *
 * It is a SOURCE scan of `index.css` rather than a render, deliberately: the
 * test harness has no DOM and no cascade, so "does this token exist" is a fact
 * about the stylesheet and nowhere else. `factionCssVar` builds the name, so a
 * change to the slug→key mapping moves this test with it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FACTION_MANIFESTS, surfaceMap } from '../../../factions'
import { factionCssVar } from '../../../utils/factions'
import { COMMENT_CHROME_SLOTS } from '../Comment'

const CSS = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

/** `factionCssVar` hands back `var(--x)`; the declaration is named `--x`. */
function tokenName(slug: string, slot: string): string {
  return factionCssVar(slug, `comment-${slot}`).slice(4, -1)
}

/**
 * Every slug the shared chassis can be asked to paint: the ones with no voice
 * of their own, plus `na` — which is where an unknown slug and Albescent's
 * pass-through wrapper both land.
 */
const PAINTED_BY_THE_CHASSIS = (() => {
  const voices = surfaceMap('comment')
  const chassisOnly = FACTION_MANIFESTS.map((m) => m.slug).filter(
    (slug) => voices[slug] === undefined,
  )
  return ['na', ...chassisOnly]
})()

describe('the shared comment resolves its chrome from tokens (#2650)', () => {
  it('has slugs to check at all, and na is always one of them', () => {
    // Guards the guard: a list that emptied would be vacuously green forever.
    expect(PAINTED_BY_THE_CHASSIS).toContain('na')
    expect(COMMENT_CHROME_SLOTS.length).toBeGreaterThan(20)
  })

  it.each(PAINTED_BY_THE_CHASSIS)('declares a complete set for %s', (slug) => {
    const missing = COMMENT_CHROME_SLOTS.filter(
      (slot) => !CSS.includes(`${tokenName(slug, slot)}:`),
    )
    expect(
      missing,
      `${slug} has no comment voice, so the shared chassis paints it — and the\n` +
        `chassis reads every slot below off index.css. An undeclared one is not\n` +
        `an error, it is an unstyled sheet: \`var(--nothing)\` resolves to the\n` +
        `empty string and the declaration is simply dropped.\n\n` +
        `Declare them on \`:root, [data-theme]\` (#1839), as aliases onto the\n` +
        `tokens the faction already paints with — never as fresh colour.`,
    ).toEqual([])
  })
})

describe('the comment token set is a transcription, never new colour (#2650)', () => {
  /** Every `--faction-*-comment-*: <value>;` declaration in the stylesheet. */
  const DECLARATIONS = [...CSS.matchAll(/(--faction-[\w-]+-comment-[\w-]+)\s*:\s*([^;]+);/g)]

  it('found the block at all', () => {
    expect(DECLARATIONS.length).toBeGreaterThan(50)
  })

  it('names no colour of its own — every value is an alias or a geometry', () => {
    // A `#` in a value is a literal pigment, which would make this a redesign
    // rather than a migration. The braid's data URI carries its hexes
    // percent-encoded (`%23`), so it is not a false positive.
    const literals = DECLARATIONS.filter(([, , value]) => /#[0-9a-fA-F]{3}/.test(value)).map(
      ([, name]) => name,
    )
    expect(
      literals,
      `A --faction-*-comment-* token names a raw colour. The whole point of\n` +
        `#2650 is that these are TRANSCRIBED from what each voice already\n` +
        `painted: every colour slot must be \`var(--faction-…)\` onto a token\n` +
        `that already ships, so the migration cannot change a pixel.`,
    ).toEqual([])
  })
})
