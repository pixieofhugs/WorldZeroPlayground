/**
 * Where the UA edit leaf puts its two shared slots, and why (#2537): the
 * re-measurement `editCharacterSlots`' `ponytail:` note asks for.
 *
 * The tail sits BELOW the sheet, on `--color-bg-page` under the `.na-backdrop`
 * wash (this route has no faction backdrop). The slot takes the edited
 * character's alarm, `--faction-ua-card-alarm` — a new pairing. Wash stops are
 * read from `index.css`; each is a corner radial, composited alone.
 *
 * The leaf block measures the rejected placement: `FactionRow`'s 6%-white row on
 * the washed leaf misses AA in dark. If it ever clears, the tail may move.
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

const INDEX_CSS = readIndexCss()
const THEMES = readThemes(INDEX_CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']
const SLOTS = readFileSync(fileURLToPath(new URL('../editCharacterSlots.tsx', import.meta.url)), 'utf8')
const ARCHETYPE_SOURCE = readFileSync(
  fileURLToPath(new URL('../archetypes/UaEditCharacter.tsx', import.meta.url)),
  'utf8',
)
/** The tail's own plate (#3009) — see the archetype's header. */
const TAIL_FILL = '--faction-ua-panel'
const TAIL_EDGE = '--faction-ua-card-accent'
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

/** The `.na-backdrop` stops for one theme (dark repaints every stop). */
function washStops(theme: Theme): string[] {
  const marker = theme === 'dark' ? '[data-theme="dark"] .na-backdrop {' : '\n.na-backdrop {'
  const start = INDEX_CSS.indexOf(marker)
  expect(start, `the ${theme} .na-backdrop rule exists`).toBeGreaterThan(-1)
  const block = INDEX_CSS.slice(start, INDEX_CSS.indexOf('}', start))
  const stops = [...block.matchAll(/rgba\([^)]*\)/g)].map(([whole]) => whole)
  expect(stops.length, `the ${theme} wash still paints its stops`).toBe(5)
  return stops
}

/** The page stock with one wash stop over it — the ground the tail lands on. */
function pageUnderWash(theme: Theme, stop: string): Rgba {
  const wash = parseColor(stop)
  expect(wash, `${stop} parses`).not.toBeNull()
  return compositeOver(wash!, resolve('--color-bg-page', theme))
}

/** Every ink the two slots put on that ground, and what draws it. */
const TAIL_INKS: Array<{ what: string; token: string }> = [
  // The edited character's alarm: UA's, not na's.
  { what: "delete's resting outline and its confirm panel", token: '--faction-ua-card-alarm' },
  { what: 'the faction label and the confirm prompt', token: '--color-text-secondary' },
  { what: "the faction row's help line", token: '--color-text-tertiary' },
]

describe('the tail below the UA leaf clears AA on the page it stands on', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of TAIL_INKS) {
      it(`${what} — ${theme}`, () => {
        for (const stop of washStops(theme)) {
          const ratio = contrastRatio(resolve(token, theme), pageUnderWash(theme, stop))
          expect(
            ratio,
            `${token} over ${stop} is ${formatRatio(ratio)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)
        }
      })
    }

    it(`the faction row's own plate carries its ink — ${theme}`, () => {
      // #3009: the row takes the tail's own well, {@link TAIL_FILL}.
      for (const stop of washStops(theme)) {
        const row = compositeOver(resolve(TAIL_FILL, theme), pageUnderWash(theme, stop))
        const ratio = contrastRatio(resolve('--color-text-secondary', theme), row)
        expect(ratio, `the faction name over ${stop} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        )
      }
    })

    it(`the confirm's cancel key, on that same plate — ${theme}`, () => {
      for (const stop of washStops(theme)) {
        const well = compositeOver(resolve(TAIL_FILL, theme), pageUnderWash(theme, stop))
        const ratio = contrastRatio(resolve('--color-text-primary', theme), well)
        expect(ratio, `the cancel key over ${stop} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        )
      }
    })
  }
})

describe("the tail's plate edge is identifiable at 3:1 (WCAG 1.4.11, #3009)", () => {
  // 1.4.11: 3:1 against adjacent colour, of the edge when it carries the boundary.
  for (const theme of BOTH_THEMES) {
    it(`the plate edge against the washed page — ${theme}`, () => {
      for (const stop of washStops(theme)) {
        const ratio = contrastRatio(resolve(TAIL_EDGE, theme), pageUnderWash(theme, stop))
        expect(
          ratio,
          `${TAIL_EDGE} over ${stop} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_LARGE)
      }
    })

    it(`the plate edge against the well it encloses — ${theme}`, () => {
      for (const stop of washStops(theme)) {
        const well = compositeOver(resolve(TAIL_FILL, theme), pageUnderWash(theme, stop))
        const ratio = contrastRatio(resolve(TAIL_EDGE, theme), well)
        expect(ratio, `${TAIL_EDGE} on ${TAIL_FILL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_LARGE,
        )
      }
    })

    it(`the shared neutral pair would still miss 3:1 on the washed page — ${theme}`, () => {
      // Why the override is a fix, not a preference.
      for (const stop of washStops(theme)) {
        const ground = pageUnderWash(theme, stop)
        const neutralPlate = compositeOver(resolve(SHARED_PLATE, theme), ground)
        const fill = contrastRatio(neutralPlate, ground)
        expect(fill, `the neutral plate over ${stop} reads ${formatRatio(fill)}`).toBeLessThan(
          AA_LARGE,
        )
        const edge = contrastRatio(
          compositeOver(resolve(SHARED_EDGE, theme), neutralPlate),
          neutralPlate,
        )
        expect(edge, `its hairline reads ${formatRatio(edge)}`).toBeLessThan(AA_LARGE)
      }
    })
  }
})

describe('and the leaf is the ground it could NOT have stood on', () => {
  /** The sheet under the lotus wash — what a mark on the leaf really sits on. */
  function washedLeaf(theme: Theme): Rgba {
    const alpha = Number(resolveVar('--faction-ua-card-lotus-opacity', theme, THEMES))
    expect(alpha, `the lotus opacity is a number in ${theme}`).toBeGreaterThan(0)
    return compositeOver(
      { ...resolve('--faction-ua-card-lotus', theme), a: alpha },
      resolve('--faction-ua-card-bg', theme),
    )
  }

  it('the faction row would miss AA on the leaf in dark — which is why the tail is off it', () => {
    // The alarm clears the leaf; `FactionRow`'s box is what fails.
    const row = compositeOver(resolve('--color-bg-surface-alt', 'dark'), washedLeaf('dark'))
    const ratio = contrastRatio(resolve('--color-text-secondary', 'dark'), row)
    expect(ratio, `the faction name on the leaf is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })

  it('and clears it in light, so this is a dark-only miss and invisible to a light-only check', () => {
    const row = compositeOver(resolve('--color-bg-surface-alt', 'light'), washedLeaf('light'))
    const ratio = contrastRatio(resolve('--color-text-secondary', 'light'), row)
    expect(ratio, `the faction name on the leaf is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

describe('keeps the placement in step with the archetype', () => {
  // The grounds above hold only while both slots sit below the sheet.
  const source = readFileSync(
    fileURLToPath(new URL('../archetypes/UaEditCharacter.tsx', import.meta.url)),
    'utf8',
  )

  it('mounts the two slots rather than redrawing them', () => {
    expect(source).toContain("from '../editCharacterSlots'")
  })

  it('mounts them after the sheet closes, faction row first', () => {
    const sheetCloses = source.indexOf('</ComposerSheet>')
    const factionRow = source.indexOf('<FactionRow')
    const deleteSlot = source.indexOf('<DeleteCharacter')
    expect(sheetCloses, 'the leaf closes').toBeGreaterThan(-1)
    expect(factionRow, 'the faction row is mounted after the leaf closes').toBeGreaterThan(sheetCloses)
    expect(deleteSlot, 'the destructive act comes last').toBeGreaterThan(factionRow)
  })

  it('the plate is handed in through the dress seam, on both controls (#3009)', () => {
    expect(SLOTS, 'the shared default is still the neutral plate').toContain(`var(${SHARED_PLATE})`)
    expect(SLOTS, '…behind the neutral hairline').toContain(`var(${SHARED_EDGE})`)
    expect(ARCHETYPE_SOURCE, 'the tail cuts one plate for both controls').toMatch(
      /const tailPlate[\s\S]*?background: FIELD[\s\S]*?solid \$\{TAIL_EDGE\}/,
    )
    expect(ARCHETYPE_SOURCE, 'the faction row takes it').toContain('rowStyle={tailPlate}')
    expect(ARCHETYPE_SOURCE, "so does the confirm's cancel key").toContain('cancelStyle={tailPlate}')
  })
})
