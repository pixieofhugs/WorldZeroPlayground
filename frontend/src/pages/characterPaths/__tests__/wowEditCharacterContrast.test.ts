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
 * Every INK clears AA with room, in both cascades — the cream is a pale warm
 * stock by day and a deep one by night, and they all flip with it. That is a
 * result rather than an assumption: `--color-danger`, the ink this slot shipped
 * with before #2788 lifted it, reads 4.40:1 on this same cream and would have
 * missed.
 *
 * ## The NON-TEXT rows, and why this file first shipped without them (#2987)
 *
 * Four text rows all cleared AA, so the sheet read as guarded and was not. Type
 * is not the only thing on it: the faction row is a PLATE, and the shared slot's
 * plate is `--color-bg-surface-alt` behind a `--color-border-strong` hairline —
 * 1.06:1 of fill and 1.41 / 1.56 of edge on this cream, where 1.4.11 asks 3:1 of
 * a graphical boundary that carries meaning. A plate edge delimiting a control
 * region is exactly that, and a text-only suite cannot see it, which is how the
 * shortfall shipped green.
 *
 * So this file now measures the boundary too, and `WowEditCharacter` repaints
 * both plates on the codicil through #2956's dress seam rather than by editing
 * the shared file. The measurements live beside {@link PLATE} / {@link EDGE};
 * the guard that the paint measured here is the paint on screen is
 * `the plate under both shared controls is the charter's`.
 *
 * The gap is NOT WOW-only — every one of the eight edit lanes mounts the same
 * neutral plate, reading 1.01–1.18 of fill and 1.40–1.72 of edge on its own
 * ground, Singularity's `-term-*` repoint included. This file fixes and guards
 * the lane it is named for; the extent is its own issue.
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
  AA_LARGE,
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
/**
 * THE PLATE UNDER THE ROW, AND THE EDGE THAT IDENTIFIES IT (#2987).
 *
 * The shared slot's own plate is `--color-bg-surface-alt` behind a
 * `--color-border-strong` hairline — an app-neutral pair, and on this cream it
 * reads 1.06:1 of fill and 1.41:1 of edge. A plate delimiting a control region
 * is a graphical boundary that carries meaning, so 1.4.11 asks 3:1 of it and
 * the neutral pair misses by better than half. {@link SHARED_PLATE} below keeps
 * both readings, because "the default would miss here" is the measurement that
 * makes this override a fix rather than a preference.
 *
 * NO IN-FAMILY STOCK CAN CARRY THAT AS A FILL, and this is the design decision
 * rather than a shortfall: the chronicle panel is 1.12 / 1.15 against its own
 * cream, and a well that cleared 3:1 against the sheet would read as a hole
 * punched in the parchment rather than as a plate laid on it. 1.4.11 does not
 * ask for it either — what it asks is that the information identifying the
 * component be 3:1 against ADJACENT colour, and for a plate that is its EDGE.
 * So the codicil hands the row the charter's own inset plate and cuts it with
 * the charter's own deep edge, and the edge is measured on both of the colours
 * it lies between: the sheet outside it and the plate inside it.
 */
const PLATE = '--faction-wow-chronicle-panel'
/** The deep olive-gold the charter letters its labels in — 5.32 / 8.83 on cream. */
const EDGE = '--faction-wow-accent-deep'
/** What the shared slot still draws for any mount that passes nothing. */
const SHARED_PLATE = '--color-bg-surface-alt'
/** The shared slot's own hairline, the other half of that default. */
const SHARED_EDGE = '--color-border-strong'

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
    over: PLATE,
  },
  {
    what: "the row's disclosure chevron, on that same plate",
    token: '--color-text-tertiary',
    over: PLATE,
  },
  {
    what: "the confirm's cancel key, on the plate the codicil gives it",
    token: '--color-text-primary',
    over: PLATE,
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
    expect(ARCHETYPE).toContain('<FactionRow')
    expect(ARCHETYPE).toContain('slug={character.faction_slug}')
    expect(ARCHETYPE).toContain('<DeleteCharacter')
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
  })

  it('the plate under both shared controls is the charter\'s, handed in through the seam', () => {
    // The two grounds measured below are the ones on screen only because this
    // archetype passes them. The shared slot's own default is still the neutral
    // pair — untouched, because #2956's seam exists precisely so a dress can
    // repaint without eight archetypes sharing one repaint (`rowStyle` /
    // `cancelStyle`, both spread LAST over the defaults).
    expect(SLOTS, 'the shared default is still the neutral plate').toContain(
      `var(${SHARED_PLATE})`,
    )
    expect(SLOTS, '…behind the neutral hairline').toContain(`var(${SHARED_EDGE})`)

    expect(ARCHETYPE).toContain(`const FIELD = 'var(${PLATE})'`)
    expect(ARCHETYPE).toContain(`const LABEL = 'var(${EDGE})'`)
    expect(ARCHETYPE, 'the codicil cuts one plate for both controls').toMatch(
      /const codicilPlate[\s\S]*?background: FIELD[\s\S]*?solid \$\{LABEL\}/,
    )
    expect(ARCHETYPE, 'the faction row takes it').toContain('rowStyle={codicilPlate}')
    expect(ARCHETYPE, 'so does the confirm’s cancel key').toContain('cancelStyle={codicilPlate}')
  })
})

describe('the codicil’s plates are identifiable at 3:1 (WCAG 1.4.11)', () => {
  // 1.4.11 asks 3:1 of the visual information that identifies a component
  // against ADJACENT colour — not 4.5:1, and not of the fill when an edge
  // carries the boundary. A plate edge delimiting a control region is exactly
  // that information, so it is measured on BOTH sides: the sheet it lies on and
  // the well it encloses. A text-only suite cannot see either, which is how the
  // neutral pair shipped green here.
  const BOUNDARIES: Array<{ what: string; token: string }> = [
    { what: "the faction row's plate edge, and the cancel key's", token: EDGE },
    { what: 'the delete outline and the confirm panel frame', token: '--faction-wow-card-alarm' },
  ]

  for (const theme of BOTH_THEMES) {
    for (const { what, token } of BOUNDARIES) {
      it(`${what} — against the sheet, ${theme}`, () => {
        const ratio = contrastRatio(resolve(token, theme), resolve(SHEET, theme))
        expect(ratio, `${token} on ${SHEET} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_LARGE,
        )
      })
    }

    it(`the plate edge against the well it encloses — ${theme}`, () => {
      const well = compositeOver(resolve(PLATE, theme), resolve(SHEET, theme))
      const ratio = contrastRatio(resolve(EDGE, theme), well)
      expect(ratio, `${EDGE} on ${PLATE} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_LARGE)
    })

    it(`the shared neutral pair would miss 3:1 on this sheet — ${theme}`, () => {
      // Why the override is a fix and not a preference, restated on the ground
      // that forced it. Same shape as the `--color-danger` reading below: the
      // paint that WOULD have shipped, measured where it would have shipped.
      const neutralPlate = compositeOver(resolve(SHARED_PLATE, theme), resolve(SHEET, theme))
      const fill = contrastRatio(neutralPlate, resolve(SHEET, theme))
      expect(fill, `the neutral plate reads ${formatRatio(fill)} on the cream`).toBeLessThan(
        AA_LARGE,
      )
      const edge = contrastRatio(compositeOver(resolve(SHARED_EDGE, theme), neutralPlate), neutralPlate)
      expect(edge, `its hairline reads ${formatRatio(edge)}`).toBeLessThan(AA_LARGE)
    })
  }
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
