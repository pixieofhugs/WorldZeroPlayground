/**
 * The codicil's ground (#2537): `WowEditCharacter` mounts the shared slots on a
 * second WOW sheet (`--faction-wow-card-bg`), so this is the re-measurement
 * `editCharacterSlots.tsx`'s `ponytail:` note asks for. It lives here, not in
 * `factionContrast.test.ts`: most rows are a shared component's neutrals on a
 * faction ground, which that file's role loop can't see.
 *
 * Non-text rows (#2987): the shared neutral plate misses 1.4.11's 3:1, so the
 * archetype hands both controls the charter's plate and edge via the #2956 dress
 * seam. Each token is also asserted to still be drawn by the slot source.
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
 * The plate under the row, and the edge that identifies it (#2987). A 3:1 fill
 * would read as a hole in the parchment; 1.4.11 asks 3:1 of the EDGE against
 * adjacent colour, so the edge is measured against both sheet and plate.
 */
const PLATE = '--faction-wow-chronicle-panel'
const EDGE = '--faction-wow-accent-deep'
/** What the shared slot still draws for any mount that passes nothing. */
const SHARED_PLATE = '--color-bg-surface-alt'
const SHARED_EDGE = '--color-border-strong'

/** Every ink on the sheet; `over` is a layer between (translucent in dark). */
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
    // A role-map repoint of WOW's paper must move this measurement too.
    expect(ARCHETYPE).toContain("const SHEET = 'var(--wow-edit-paper)'")
    expect(factionRoleVar('wow', 'paper')).toBe(`var(${SHEET})`)
  })

  it('every ink measured below is one the shared slot actually draws', () => {
    // Neutrals hunted as tokens; the alarm as the `factionCssVar` call.
    for (const { token } of INKS.filter(({ token }) => token.startsWith('--color-'))) {
      expect(SLOTS, `editCharacterSlots no longer draws ${token}`).toContain(`var(${token})`)
    }
    expect(SLOTS, 'the alarm is still taken from the faction').toContain(
      "factionCssVar(slug ?? UNAFFILIATED_FACTION_SLUG, 'card-alarm')",
    )
    expect(factionCssVar('wow', 'card-alarm')).toBe('var(--faction-wow-card-alarm)')
  })

  it('the plate under both shared controls is the charter\'s, handed in through the seam', () => {
    // The grounds below are on screen only because this archetype passes them.
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
  // 1.4.11: the edge at 3:1 on both sides, the sheet and the well it encloses.
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
      // Why the override is a fix, not a preference.
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
  // Why the slot takes `factionCssVar(slug, 'card-alarm')` (#2788).
  it('`--color-danger` would miss AA on this sheet in light', () => {
    const ratio = contrastRatio(resolve('--color-danger', 'light'), resolve(SHEET, 'light'))
    expect(ratio, `--color-danger reads ${formatRatio(ratio)} on the charter sheet`).toBeLessThan(
      AA_NORMAL,
    )
  })

  it('the confirm button keeps the neutral pair, because that is a ground and its ink', () => {
    // A fill and its ink: the sheet never reaches it.
    for (const theme of BOTH_THEMES) {
      const ratio = contrastRatio(resolve('--color-on-danger', theme), resolve('--color-danger', theme))
      expect(ratio, `the filled confirm reads ${formatRatio(ratio)} in ${theme}`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      )
    }
  })
})
