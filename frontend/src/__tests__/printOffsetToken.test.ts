/**
 * The flyposter's flat offset print register — `--color-print-offset` (#1609,
 * class 1 of `.eslint-legacy-raw-colours.txt`).
 *
 * WHY A GUARD AND NOT A SCREENSHOT
 * -------------------------------
 * The whole claim of that migration is that NO PIXEL MOVED: seventeen sites gave
 * up `rgba(0, 0, 0, α)` for `color-mix(in srgb, var(--color-print-offset) α%,
 * transparent)`, which is the same paint by the spec's premultiplied srgb rule.
 * Nobody had a browser to check it, so these are the evidence a reviewer has
 * instead of eyes — and each of the three ways to break the claim is invisible in
 * a green build.
 *
 * **Add a dark half.** One `[data-theme="dark"]` line silently restyles all
 * seventeen. The absence is the DECISION, argued at the declaration in
 * `index.css`: a cast lifts and so deepens at night, but an offset register is
 * part of the drawing and the grounds it is struck on (S.N.I.D.E.'s press
 * constants, Everymen's poster frame) are theme-invariant by their own rulings.
 * Where a printed offset does need a night answer the fix is GEOMETRY — see
 * `--faction-snide-note-wall-shadow`, which trades its offset for a hairline —
 * and geometry lives at the call site.
 *
 * **Change a strength.** The nine surviving values are per-site drawing, not a
 * scale, so nothing else in the repo would notice one drifting. The ledger below
 * is what notices.
 *
 * **Regrow the class.** The ratchet cannot see this class in three of the shapes
 * it is written in — `filter:`, a `shadow=` JSX prop, a module constant — so
 * `no-raw-colour-values` reporting zero proves nothing here. Two of the
 * seventeen were never on the legacy list at all.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED
 * ---------------------------------
 * That the nine strengths collapse to one. That is the honest next move and it is
 * a DESIGN call that needs eyes on seventeen surfaces; the token exists so it can
 * be made in one line. A test pinning it either way would be voting.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { readThemes } from '../utils/__tests__/cssVars'
import { readStripped, sourceFiles, toRelative } from '../test/sourceScan'

const TOKEN = '--color-print-offset'

const themes = readThemes(
  readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8'),
)

/**
 * The strength each migrated site prints at, as it printed before the token.
 * Sorted per file so the entry is a set of values rather than a source order that
 * moves when a file is reordered.
 *
 * If you added a NEW offset register, add its strength here — and say in the PR
 * whether you looked at it, because this file is the only thing standing in for a
 * pair of eyes.
 */
const STRENGTH_LEDGER: Record<string, number[]> = {
  'components/factionHero/SnideFactionHero.tsx': [32, 40, 40],
  'components/metataskSeal/skins/SnideSeal.tsx': [35, 40],
  'pages/characterProfile/archetypes/EverymenProfileBody.tsx': [40],
  'pages/characterProfile/archetypes/SnideProfileBody.tsx': [45, 50, 55],
  'pages/factionDetail/archetypes/SnideFactionBody.tsx': [20, 22, 30, 35, 40, 45],
  'pages/fieldDesk/mobileArchetypes/SnideFieldDesk.tsx': [40, 50],
}

/** Every `color-mix(in srgb, var(--color-print-offset) N%, transparent)` in `source`. */
const strengthsIn = (source: string): number[] =>
  [
    ...source.matchAll(
      new RegExp(`color-mix\\(\\s*in srgb,\\s*var\\(${TOKEN}\\)\\s*([\\d.]+)%\\s*,\\s*transparent\\s*\\)`, 'g'),
    ),
  ]
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b)

/**
 * A zero-blur offset shadow painted with a raw colour — the class, in every
 * spelling, including the three the ratchet is blind to.
 *
 * The X offset must be NON-ZERO, and that is the line between this class and
 * class 5's printed RULE (`0 2px 0 rgba(34, 26, 18, 0.22)` under the Everymen
 * masthead), which stays raw on its own written reason. A register is offset
 * sideways; a rule is not.
 *
 * `rgb(var(--x) / .4)` and `color-mix(...)` are excluded by construction — the
 * argument class admits no letters — which is the same `[\d.]` lookahead the
 * lint rule uses to tell a hardcoded colour from a token doing alpha.
 */
const ZERO_BLUR_RAW = /(-?[\d.]+)px\s+-?[\d.]+px\s+0(?:px)?\s+(?:(?:rgba?|hsla?)\([\s\d.,%/]*\)|#[0-9a-fA-F]{3,8})/g

describe(`${TOKEN} is theme-invariant on purpose`, () => {
  it('is declared once, as opaque black', () => {
    expect(themes.light.get(TOKEN)).toBe('#000000')
  })

  it('has NO dark counterpart — the absence is the decision, not an omission', () => {
    // A dark half here repaints seventeen surfaces at once, silently and
    // greenly. Read the paragraph beside the declaration in index.css before
    // deleting this: the answer for a mark that needs a night value is geometry
    // at the call site, not a second colour.
    expect(themes.dark.has(TOKEN)).toBe(false)
  })

  it('is not an alias of the cast tokens, which DO lift at night', () => {
    // Same light black, opposite dark behaviour. Collapsing the two is the
    // category error the legacy list names.
    expect(themes.dark.get('--color-cast-shadow')).toBeDefined()
    expect(themes.light.get(TOKEN)).not.toBe(themes.light.get('--color-cast-shadow'))
  })
})

describe('every offset register keeps the strength it was printed at', () => {
  const found = new Map<string, number[]>()
  for (const path of sourceFiles()) {
    const strengths = strengthsIn(readStripped(path))
    if (strengths.length > 0) found.set(toRelative(path), strengths)
  }

  it('matches the ledger, file for file and value for value', () => {
    expect(Object.fromEntries([...found].sort())).toEqual(STRENGTH_LEDGER)
  })

  it('covers all seventeen sites the migration names', () => {
    expect([...found.values()].flat()).toHaveLength(17)
  })
})

describe('the class cannot regrow', () => {
  it('no source file paints a zero-blur offset register with a raw colour', () => {
    const findings = sourceFiles().flatMap((path) =>
      [...readStripped(path).matchAll(ZERO_BLUR_RAW)]
        .filter((match) => Number(match[1]) !== 0)
        .map((match) => `${toRelative(path)}: ${match[0]}`),
    )

    expect(findings).toEqual([])
  })
})
