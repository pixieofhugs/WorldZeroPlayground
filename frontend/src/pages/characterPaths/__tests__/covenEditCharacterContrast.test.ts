/**
 * Coven edit-character tail on the ground it lands on (#2537): the re-measure
 * `editCharacterSlots`' `ponytail:` note asks of any archetype placing the slots off the
 * na page. The slots are neutral app chrome an archetype may place but not
 * repaint; on the washed slip the faction row reads 4.06:1 in dark, so the tail
 * sits below the slip on bare `--color-bg-page` (no backdrop on this route).
 * Pixels are visual QA, not proven here.
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

const ARCHETYPE_PATH = fileURLToPath(new URL('../archetypes/CovenEditCharacter.tsx', import.meta.url))
const ARCHETYPE = readFileSync(ARCHETYPE_PATH, 'utf8')
const SLOTS = readFileSync(fileURLToPath(new URL('../editCharacterSlots.tsx', import.meta.url)), 'utf8')
const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

/** The app's own paper — what is behind the tail, and behind nothing else here. */
const PAGE = '--color-bg-page'
/** The slip's stock and the bloom anchored at its top-left, for the refused row. */
const SHEET = '--faction-coven-ward-card'
const PINK = '--faction-coven-slip-pk'
/** The tail's own plate (#3009) — see the archetype's header. */
const TAIL_FILL = '--faction-coven-card-bg'
const TAIL_EDGE = '--faction-coven-accent-ink'
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

/** The haze strength, read from the stylesheet rather than transcribed. */
function haze(theme: Theme): number {
  const raw = resolveVar('--faction-coven-ward-haze', theme, THEMES)
  const value = Number(raw)
  expect(Number.isFinite(value), `--faction-coven-ward-haze is a number in ${theme}`).toBe(true)
  return value
}

/** Every ink the two slots put on whatever ground the archetype hands them. */
const SLOT_INKS: Array<{ what: string; token: string }> = [
  // The faction's own ink, and why this file exists.
  { what: "the destructive slot's outline and its ink", token: '--faction-coven-card-alarm' },
  { what: 'the faction row label and the confirm prompt', token: '--color-text-secondary' },
  { what: "the faction row's help line and its chevron", token: '--color-text-tertiary' },
]

describe('the Coven tail clears AA on the app page it sits on', () => {
  for (const theme of BOTH_THEMES) {
    for (const ink of SLOT_INKS) {
      it(`${ink.what} — ${theme}`, () => {
        const ratio = contrastRatio(resolve(ink.token, theme), resolve(PAGE, theme))
        expect(
          ratio,
          `${ink.token} on ${PAGE} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }

  it.each(BOTH_THEMES)(
    "the faction row's own plate carries its ink — %s",
    (theme) => {
      // #3009: the row now takes the tail's own plate, so measure on that.
      const row = compositeOver(resolve(TAIL_FILL, theme), resolve(PAGE, theme))
      const ratio = contrastRatio(resolve('--color-text-secondary', theme), row)
      expect(ratio, `the faction row reads ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
    },
  )

  it.each(BOTH_THEMES)("the confirm's cancel key, on that same plate — %s", (theme) => {
    const well = compositeOver(resolve(TAIL_FILL, theme), resolve(PAGE, theme))
    const ratio = contrastRatio(resolve('--color-text-primary', theme), well)
    expect(ratio, `the cancel key reads ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})

describe("the tail's plate edge is identifiable at 3:1 (WCAG 1.4.11, #3009)", () => {
  // 1.4.11: 3:1 for the identifying edge against adjacent colour.
  for (const theme of BOTH_THEMES) {
    it(`the plate edge against the page — ${theme}`, () => {
      const ratio = contrastRatio(resolve(TAIL_EDGE, theme), resolve(PAGE, theme))
      expect(ratio, `${TAIL_EDGE} on ${PAGE} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
        AA_LARGE,
      )
    })

    it(`the plate edge against the well it encloses — ${theme}`, () => {
      const well = compositeOver(resolve(TAIL_FILL, theme), resolve(PAGE, theme))
      const ratio = contrastRatio(resolve(TAIL_EDGE, theme), well)
      expect(ratio, `${TAIL_EDGE} on ${TAIL_FILL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
        AA_LARGE,
      )
    })

    it(`the shared neutral pair would still miss 3:1 on the page — ${theme}`, () => {
      // Why the override is a fix: the shared neutral pair misses here.
      const neutralPlate = compositeOver(resolve(SHARED_PLATE, theme), resolve(PAGE, theme))
      const fill = contrastRatio(neutralPlate, resolve(PAGE, theme))
      expect(fill, `the neutral plate reads ${formatRatio(fill)} on the page`).toBeLessThan(AA_LARGE)
      const edge = contrastRatio(
        compositeOver(resolve(SHARED_EDGE, theme), neutralPlate),
        neutralPlate,
      )
      expect(edge, `its hairline reads ${formatRatio(edge)}`).toBeLessThan(AA_LARGE)
    })
  }
})

describe('the ground the archetype refused, measured', () => {
  /* The refused placement, as arithmetic (cf. the 0.7 wash row in
     `covenCreateCharacterContrast.test.ts`); goes red if it ever clears. */
  it('the faction row on the washed slip misses AA in dark, so the tail stays off the sheet', () => {
    const washed = compositeOver({ ...resolve(PINK, 'dark'), a: haze('dark') }, resolve(SHEET, 'dark'))
    const row = compositeOver(resolve('--color-bg-surface-alt', 'dark'), washed)
    const ratio = contrastRatio(resolve('--color-text-secondary', 'dark'), row)
    expect(ratio, `on the pink-washed sheet the row reads ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })
})

describe('keeps the measured placement in step with the archetype', () => {
  // Premise of every number above: the tail is outside the sheet.
  it('mounts both slots after the sheet and after the form', () => {
    const closesForm = ARCHETYPE.indexOf('</form>')
    const row = ARCHETYPE.indexOf('<FactionRow')
    const del = ARCHETYPE.indexOf('<DeleteCharacter')
    expect(closesForm, 'the archetype draws a real form').toBeGreaterThan(-1)
    expect(row, 'the faction row is mounted below the slip').toBeGreaterThan(closesForm)
    expect(del, 'and the destructive act below it, in that order').toBeGreaterThan(row)
  })

  it('draws them once each — the slots are mounted, not re-drawn per width', () => {
    expect(ARCHETYPE.match(/<FactionRow/g)).toHaveLength(1)
    expect(ARCHETYPE.match(/<DeleteCharacter/g)).toHaveLength(1)
  })

  it('the plate is handed in through the dress seam, on both controls (#3009)', () => {
    expect(SLOTS, 'the shared default is still the neutral plate').toContain(`var(${SHARED_PLATE})`)
    expect(SLOTS, '…behind the neutral hairline').toContain(`var(${SHARED_EDGE})`)
    expect(ARCHETYPE).toContain(`background: TAIL_FILL`)
    expect(ARCHETYPE).toContain(`border: \`1px solid \${TAIL_EDGE}\``)
    expect(ARCHETYPE, 'the tail cuts one plate for both controls').toMatch(
      /const tailPlate[\s\S]*?background: TAIL_FILL[\s\S]*?solid \$\{TAIL_EDGE\}/,
    )
    expect(ARCHETYPE, 'the faction row takes it').toContain('rowStyle={tailPlate}')
    expect(ARCHETYPE, "so does the confirm's cancel key").toContain('cancelStyle={tailPlate}')
  })
})
