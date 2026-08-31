/**
 * The two edit-only slots, measured on the ground S.N.I.D.E. actually puts them
 * on (part of #2537's fan-out).
 *
 * WHY THIS FILE EXISTS AT ALL. `editCharacterSlots.tsx` carries a `ponytail:`
 * note in as many words: *"the alarm ink is measured on the na page's washed
 * ground only, because that is the only ground an edit archetype draws on today.
 * A faction archetype that lands this slot on its own SHEET must re-measure its
 * `-card-alarm` against that sheet in its own PR."* `SnideEditCharacter` lands
 * both slots on the flyposted wall, so this is that re-measurement — and it does
 * not confirm the na reading, it INVERTS it.
 *
 * WHAT IS DELIBERATELY NOT HERE. `--faction-snide-wall-alarm` bare, on all four
 * of this wall's readings in both themes, is already SNIDE_WALL_PAIRS' row
 * *"the join error, bare"* in `utils/__tests__/factionContrast.test.ts`.
 * Restating it would be a second name for one measurement, which that file warns
 * against in as many words. What this file adds instead is the BINDING: the
 * archetype's re-point target is read out of its own source, so the row above is
 * proven to be about the ink this page paints rather than about a token that
 * happens to share a name.
 *
 * NOTHING HERE PROVES A PIXEL. Composite arithmetic on declared tokens, the same
 * shape `createCharacterContrast.test.ts` uses. Visual QA is stated outstanding
 * on the PR.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

const ARCHETYPE = fileURLToPath(
  new URL('../archetypes/SnideEditCharacter.tsx', import.meta.url),
)
const SOURCE = readFileSync(ARCHETYPE, 'utf8')

/**
 * The four readings of the flyposted wall — the same set SNIDE_WALL_GROUNDS
 * names, because it is the same ground. A 180deg ramp from `-wall` to
 * `-wall-deep`, with an acid wash off the top-left corner and a pink one off the
 * bottom-right; the raster and the scanline are not modelled, for that file's
 * reason (a 1-in-4 duty of a ~4% tint averages into the ground rather than
 * becoming it).
 *
 * The tail poster is the LAST thing on a tall page, so the pink corner is the
 * reading that decides — and it is the worst of the four in light.
 */
const WALL_READINGS: { where: string; surface: string; wash?: string }[] = [
  { where: 'wall', surface: '--faction-snide-wall' },
  { where: 'deep wall', surface: '--faction-snide-wall-deep' },
  { where: 'acid corner', surface: '--faction-snide-wall', wash: '--faction-snide-note-wash-acid' },
  { where: 'pink corner', surface: '--faction-snide-wall-deep', wash: '--faction-snide-note-wash-pink' },
]

/**
 * The inks `FactionRow` and `DeleteCharacter` bring with them, which this
 * archetype MOUNTS rather than re-draws and therefore cannot pass an ink to.
 *
 * They are the app's global neutrals, and no S.N.I.D.E. surface printed one
 * before this page — so this is their first reading on this wall. They clear,
 * which is what settles the slot being mounted as it stands; the alarm is the
 * one that did not, and it is handled below.
 */
const SLOT_NEUTRALS: Array<{ what: string; token: string; on?: string }> = [
  // Straight on the wall — no ground of their own.
  { what: 'the faction row eyebrow', token: '--color-text-secondary' },
  { what: 'the faction row help line', token: '--color-text-tertiary' },
  { what: 'the confirm prompt', token: '--color-text-secondary' },
  // These two paint a ground first, and it is TRANSLUCENT in dark — so the wall
  // reaches through and the reading is a composite, not a flat token. Measuring
  // the declared ground instead is exactly the failure mode #2537's acceptance
  // criterion names.
  { what: 'the faction row value', token: '--color-text-secondary', on: '--color-bg-surface-alt' },
  { what: "the confirm panel's Cancel", token: '--color-text-primary', on: '--color-bg-surface' },
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

function ground(
  theme: Theme,
  reading: (typeof WALL_READINGS)[number],
  on?: string,
): Rgba {
  const stock = resolve(reading.surface, theme)
  const wall = reading.wash ? compositeOver(resolve(reading.wash, theme), stock) : stock
  return on ? compositeOver(resolve(on, theme), wall) : wall
}

/**
 * What the archetype re-points `--faction-snide-card-alarm` to, read from its
 * own source rather than transcribed.
 *
 * `DeleteCharacter` inks itself with `factionCssVar(slug, 'card-alarm')` and
 * takes no ink prop, so the only seam an archetype has is the cascade — the
 * shape `.snd-praxis-frame` already uses for the identical problem one surface
 * over (#1153). Reading the target here is what stops this file from measuring a
 * token the page has stopped painting.
 */
function repointTarget(): string {
  const found = /'--faction-snide-card-alarm':\s*'var\((--[a-z0-9-]+)\)'/.exec(SOURCE)
  expect(
    found,
    'SnideEditCharacter no longer re-points --faction-snide-card-alarm; the delete slot is back on the pinned-bright card ink',
  ).not.toBeNull()
  return found![1]
}

describe('the destructive slot is inked for the wall, not for a slab', () => {
  it('the archetype re-points the card alarm onto the wall family', () => {
    expect(repointTarget()).toBe('--faction-snide-wall-alarm')
  })

  for (const theme of BOTH_THEMES) {
    it(`the ink the delete outline actually paints clears AA — ${theme}`, () => {
      const ink = resolve(repointTarget(), theme)
      for (const reading of WALL_READINGS) {
        const ratio = contrastRatio(ink, ground(theme, reading))
        expect(
          ratio,
          `${repointTarget()} on the ${reading.where} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    })
  }
})

describe('the na-measured alarm does NOT transfer to this ground', () => {
  /* The load-bearing half. `--faction-default-card-alarm` reads 5.89 / 7.85 on
     the na page's washed ground, and the slot's docblock records that as the
     reason the swap away from `--color-danger` is an accessibility fix. Read as
     "the card family is the answer" it is false HERE, and inverted: S.N.I.D.E.'s
     `-card-*` family is pinned for the near-black slabs pasted ON this wall (§6),
     so its alarm is #fca5a5 and reads 1.24:1 in the wall's pink corner. That is
     the same collapse #2333 refused for `-composer-alarm`, one token over.

     If this row ever goes green — the token walked, or the card ground made to
     flip — the re-point above is no longer buying anything and can be
     reconsidered. That is the outcome worth catching, which is why the refusal
     is a measurement rather than a sentence in a comment. */
  it('--faction-snide-card-alarm misses AA on every reading of the wall in light', () => {
    const ink = resolve('--faction-snide-card-alarm', 'light')
    for (const reading of WALL_READINGS) {
      const ratio = contrastRatio(ink, ground('light', reading))
      expect(
        ratio,
        `--faction-snide-card-alarm on the ${reading.where} is ${formatRatio(ratio)}`,
      ).toBeLessThan(AA_NORMAL)
    }
  })
})

describe('the slots keep their own neutral inks on this wall', () => {
  // Mounted, not re-drawn: these tokens live in `editCharacterSlots.tsx`, which
  // an archetype may not edit. So the question this file can ask is whether the
  // ground it CHOSE is one they survive — and it is. A future archetype that
  // lands the slots on a near-black S.N.I.D.E. slab instead would invert all
  // three in light, which is the reason the tail poster wears the wall.
  for (const theme of BOTH_THEMES) {
    it.each(SLOT_NEUTRALS)(`$what — ${theme}`, ({ token, on }) => {
      const ink = resolve(token, theme)
      for (const reading of WALL_READINGS) {
        const ratio = contrastRatio(ink, ground(theme, reading, on))
        expect(
          ratio,
          `${token} on ${on ?? 'the'} ${on ? 'over the ' : ''}${reading.where} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    })
  }
})
