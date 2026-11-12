/**
 * The Ephemerists edit-character tail plate, measured on its own ground
 * (`--faction-ephemerists-plate-bg`, #2537 / #3009) — the re-measurement
 * `editCharacterSlots.tsx`'s `ponytail:` note asks of an archetype that moves
 * the slots onto its own sheet.
 *
 * The shared neutral pair misses 1.4.11's 3:1 here, and no in-family fill can
 * reach it, so only the EDGE changes (`-card-accent`, ruling on #3009); the fill
 * is the plate's own inset well.
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
import { readThemes, resolveVar, type Theme } from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']
const SLOTS = readFileSync(fileURLToPath(new URL('../editCharacterSlots.tsx', import.meta.url)), 'utf8')
const ARCHETYPE = readFileSync(
  fileURLToPath(new URL('../archetypes/EphemeristsEditCharacter.tsx', import.meta.url)),
  'utf8',
)

/** The tail plate's own stock — the same ground the create/edit sheet stands on. */
const PLATE = '--faction-ephemerists-plate-bg'
/** The tail plate's own dress (#3009) — see the archetype's header. */
const TAIL_FILL = '--faction-ephemerists-plate-inner'
const TAIL_EDGE = '--faction-ephemerists-card-accent'
/** What the shared slot still draws for any mount that passes nothing. */
const SHARED_PLATE = '--color-bg-surface-alt'
const SHARED_EDGE = '--color-border-strong'

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** Every ink the two slots put straight on the plate. */
const SLOT_INKS: Array<{ what: string; token: string }> = [
  {
    what: "the destructive slot's outline and its confirm panel border",
    token: '--faction-ephemerists-card-alarm',
  },
  { what: "the faction row's label and the confirm prompt", token: '--color-text-secondary' },
  { what: "the faction row's help line and its chevron", token: '--color-text-tertiary' },
]

describe('the two edit-only slots clear AA on the Ephemerists plate', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of SLOT_INKS) {
      it(`${what} — ${theme}`, () => {
        const ratio = contrastRatio(resolve(token, theme), resolve(PLATE, theme))
        expect(ratio, `${token} on ${PLATE} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        )
      })
    }

    it(`the faction row's own plate carries its ink — ${theme}`, () => {
      const well = compositeOver(resolve(TAIL_FILL, theme), resolve(PLATE, theme))
      const ratio = contrastRatio(resolve('--color-text-secondary', theme), well)
      expect(ratio, `the faction name reads ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
    })

    it(`the confirm's cancel key, on that same plate — ${theme}`, () => {
      const well = compositeOver(resolve(TAIL_FILL, theme), resolve(PLATE, theme))
      const ratio = contrastRatio(resolve('--color-text-primary', theme), well)
      expect(ratio, `the cancel key reads ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
    })
  }
})

describe("the tail plate's edge is identifiable at 3:1 (WCAG 1.4.11, #3009)", () => {
  for (const theme of BOTH_THEMES) {
    it(`the plate edge against the sheet — ${theme}`, () => {
      const ratio = contrastRatio(resolve(TAIL_EDGE, theme), resolve(PLATE, theme))
      expect(ratio, `${TAIL_EDGE} on ${PLATE} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
        AA_LARGE,
      )
    })

    it(`the plate edge against the well it encloses — ${theme}`, () => {
      const well = compositeOver(resolve(TAIL_FILL, theme), resolve(PLATE, theme))
      const ratio = contrastRatio(resolve(TAIL_EDGE, theme), well)
      expect(ratio, `${TAIL_EDGE} on ${TAIL_FILL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
        AA_LARGE,
      )
    })

    it(`the shared neutral pair would miss 3:1 on this plate — ${theme}`, () => {
      // Why the override is a fix, not a preference.
      const neutralPlate = compositeOver(resolve(SHARED_PLATE, theme), resolve(PLATE, theme))
      const fill = contrastRatio(neutralPlate, resolve(PLATE, theme))
      expect(fill, `the neutral plate reads ${formatRatio(fill)}`).toBeLessThan(AA_LARGE)
      const edge = contrastRatio(
        compositeOver(resolve(SHARED_EDGE, theme), neutralPlate),
        neutralPlate,
      )
      expect(edge, `its hairline reads ${formatRatio(edge)}`).toBeLessThan(AA_LARGE)
    })
  }
})

describe('keeps the measured placement in step with the archetype', () => {
  it('mounts both slots on a second sheet, outside the form, faction row first', () => {
    const closesForm = ARCHETYPE.indexOf('</form>')
    const row = ARCHETYPE.indexOf('<FactionRow')
    const del = ARCHETYPE.indexOf('<DeleteCharacter')
    expect(closesForm, 'the archetype draws a real form').toBeGreaterThan(-1)
    expect(row, 'the faction row is mounted after the form closes').toBeGreaterThan(closesForm)
    expect(del, 'and the destructive act follows the row').toBeGreaterThan(row)
  })

  it('draws them once each — the slots are mounted, not re-drawn per width', () => {
    expect(ARCHETYPE.match(/<FactionRow/g)).toHaveLength(1)
    expect(ARCHETYPE.match(/<DeleteCharacter/g)).toHaveLength(1)
  })

  it('the plate is handed in through the dress seam, on both controls (#3009)', () => {
    expect(SLOTS, 'the shared default is still the neutral plate').toContain(`var(${SHARED_PLATE})`)
    expect(SLOTS, '…behind the neutral hairline').toContain(`var(${SHARED_EDGE})`)
    expect(ARCHETYPE, 'the tail plate cuts one dress for both controls').toMatch(
      /const tailPlate[\s\S]*?background: INNER[\s\S]*?solid \$\{TAIL_EDGE\}/,
    )
    expect(ARCHETYPE, 'the faction row takes it').toContain('rowStyle={tailPlate}')
    expect(ARCHETYPE, "so does the confirm's cancel key").toContain('cancelStyle={tailPlate}')
  })
})
