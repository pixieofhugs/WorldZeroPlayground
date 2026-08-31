/**
 * THE CODICIL'S GROUND — the one measurement the edit fan-out was warned it
 * would skip seven times (#2537).
 *
 * `editCharacterSlots.tsx` carries the warning as a `ponytail:` note in its own
 * header:
 *
 *   > the alarm ink is measured on the na page's washed ground only, because
 *   > that is the only ground an edit archetype draws on today. A faction
 *   > archetype that lands this slot on its own SHEET must re-measure its
 *   > `-card-alarm` against that sheet in its own PR.
 *
 * `WowEditCharacter` does exactly that. Its two slots sit on THE CODICIL, a
 * second WOW sheet below the charter, so every ink the shared slot draws lands
 * on `--faction-wow-card-bg` instead of on `--color-bg-page` under the
 * `.na-backdrop` wash. A new ground invalidates every contrast claim measured on
 * the old one, so all four are re-taken here rather than inherited.
 *
 * ## Why a file rather than a row in `utils/__tests__/factionContrast.test.ts`
 *
 * Two reasons, and the second is the load-bearing one.
 *
 * 1. THE FACTION HALF IS ALREADY A ROW THERE. `wow composer error banner, alarm
 *    ink under the danger veil` measures this exact pair — `-card-alarm` on
 *    `-card-bg` — under a veil that pulls the cream toward the ink, which is the
 *    TIGHTER reading of the two. The bare row below is the looser one and is
 *    kept because it is the pairing actually on screen; adding it to that file
 *    would be a second name for one measurement, which its own header spends a
 *    paragraph warning against.
 *
 * 2. THREE OF THE FOUR ROWS ARE NOT FACTION-ON-FACTION AT ALL. They are a
 *    SHARED COMPONENT'S neutral tiers on a faction ground — category 1 of what
 *    that file's role loop explicitly cannot see. `FactionRow` and
 *    `DeleteCharacter` are drawn once for all eight archetypes and are not this
 *    file's to repaint; what IS this archetype's is where they sit, and putting
 *    them on parchment is what re-opens their inks. The question belongs beside
 *    the archetype that made the choice, which is the same argument
 *    `covenCreateCharacterContrast.test.ts` and `createCharacterContrast.test.ts`
 *    make for living here.
 *
 * ## What the numbers say
 *
 * Every one clears AA with room, in both cascades — the cream is a pale warm
 * stock by day and a deep one by night, and all four inks flip with it. So the
 * codicil needed no repaint and no minted token, and that is a result rather
 * than an assumption: `--color-danger`, the ink this slot shipped with before
 * #2788 lifted it, reads 4.40:1 on this same cream and would have missed.
 *
 * ## What it reads out of source, and why
 *
 * The tokens are not transcribed. Each row names a token and this file asserts
 * the SLOT still draws it — so a repaint of `editCharacterSlots.tsx` in some
 * later PR turns these rows red instead of leaving them green against an ink
 * nothing renders. That is the failure mode a hand-copied contrast list has.
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
import { factionCssVar } from '../../../utils/factions'
import { factionRoleVar } from '../../../utils/factionRoles'
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

const source = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8')

const SLOTS = source('../editCharacterSlots.tsx')
const ARCHETYPE = source('../archetypes/WowEditCharacter.tsx')

/** The codicil's stock — the charter's own sheet, reached through the role map. */
const SHEET = '--faction-wow-card-bg'
/** The plate `FactionRow` brings with it, laid ON that stock. */
const ROW_PLATE = '--color-bg-surface-alt'

/**
 * Every ink the codicil puts on the sheet, and where it comes from.
 *
 * `over` names a translucent layer between the sheet and the ink — the faction
 * row draws its own plate, which is opaque in light and a 6% white wash in dark,
 * so a flat reading of it would be a reading of nothing in one of the two
 * cascades.
 */
const INKS: Array<{ what: string; token: string; over?: string }> = [
  {
    what: 'the delete outline and the confirm panel frame',
    token: '--faction-wow-card-alarm',
  },
  {
    what: "the faction row's label and the confirm prompt",
    token: '--color-text-secondary',
  },
  {
    what: "the faction row's help line",
    token: '--color-text-tertiary',
  },
  {
    what: "the faction name on the row's own plate",
    token: '--color-text-secondary',
    over: ROW_PLATE,
  },
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

describe('the codicil is the WOW sheet, and the slots are mounted on it', () => {
  it('the archetype mounts the shared slots rather than redrawing them', () => {
    expect(ARCHETYPE).toContain("from '../editCharacterSlots'")
    expect(ARCHETYPE).toContain('<FactionRow slug={character.faction_slug} />')
    expect(ARCHETYPE).toContain('<DeleteCharacter slug={character.faction_slug}')
  })

  it("the sheet under them is WOW's paper role, which is the token measured below", () => {
    // The codicil takes `sheetStyle`, whose background is `var(--wow-edit-paper)`
    // — the `paper` role under this surface's own prefix. If the role map ever
    // repoints WOW's paper, this row moves the whole measurement rather than
    // letting it drift onto a ground nothing draws.
    expect(ARCHETYPE).toContain("const SHEET = 'var(--wow-edit-paper)'")
    expect(factionRoleVar('wow', 'paper')).toBe(`var(${SHEET})`)
  })

  it('every ink measured below is one the shared slot actually draws', () => {
    // The neutrals are written as tokens and are hunted as tokens. The ALARM is
    // not: the slot reads it through `factionCssVar`, which is the whole reason
    // eight archetypes get eight different alarms out of one file — so it is
    // hunted as the CALL, and `factions.ts` is what turns that into
    // `--faction-wow-card-alarm`.
    for (const { token } of INKS.filter(({ token }) => token.startsWith('--color-'))) {
      expect(SLOTS, `editCharacterSlots no longer draws ${token}`).toContain(`var(${token})`)
    }
    expect(SLOTS, 'the alarm is still taken from the faction').toContain(
      "factionCssVar(slug ?? UNAFFILIATED_FACTION_SLUG, 'card-alarm')",
    )
    expect(factionCssVar('wow', 'card-alarm')).toBe('var(--faction-wow-card-alarm)')
    expect(SLOTS, 'the row still brings its own plate').toContain(`var(${ROW_PLATE})`)
  })
})

describe('the codicil clears AA on the charter sheet, both cascades', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token, over } of INKS) {
      it(`${what} — ${theme}`, () => {
        const ground = over
          ? compositeOver(resolve(over, theme), resolve(SHEET, theme))
          : resolve(SHEET, theme)
        const ratio = contrastRatio(resolve(token, theme), ground)
        expect(
          ratio,
          `${token} on ${over ? `${over} over ` : ''}${SHEET} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }
})

describe('the neutral danger hue is why the slot takes the faction alarm', () => {
  // Not decoration: this is the measurement that makes `factionCssVar(slug,
  // 'card-alarm')` in the shared slot a fix rather than a preference, restated
  // on the ground this archetype introduces. `--color-danger` was the ink the
  // delete control shipped with before #2788 lifted it, and it misses here for
  // the same reason it missed 3.42:1 on the na page.
  it('`--color-danger` would miss AA on this sheet in light', () => {
    const ratio = contrastRatio(resolve('--color-danger', 'light'), resolve(SHEET, 'light'))
    expect(ratio, `--color-danger reads ${formatRatio(ratio)} on the charter sheet`).toBeLessThan(
      AA_NORMAL,
    )
  })

  it('the confirm button keeps the neutral pair, because that is a ground and its ink', () => {
    // `--color-danger` / `--color-on-danger` is a FILL and the ink measured on
    // it, so the sheet never reaches it — the reason the shared slot keeps the
    // platform pair on that one control while every other mark takes the
    // faction's. Measured rather than asserted in prose.
    for (const theme of BOTH_THEMES) {
      const ratio = contrastRatio(resolve('--color-on-danger', theme), resolve('--color-danger', theme))
      expect(ratio, `the filled confirm reads ${formatRatio(ratio)} in ${theme}`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      )
    }
  })
})
