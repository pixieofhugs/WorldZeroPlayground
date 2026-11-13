/**
 * The Everymen EDIT plate's two shared slots (`../editCharacterSlots`), measured
 * on the sheet they land on (#2537) — the re-measurement that file's `ponytail:`
 * note asks for. Shared inks are covered by `everymenCreateCharacterContrast`.
 *
 * Ground: `--everymen-paper` under `.em-burst`, ray plus ONE corner glow (see
 * the create file). A red row here means move the slot, not repaint the shared
 * file. The filled confirm key is its own ground + ink, so is not measured.
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
  fileURLToPath(new URL('../archetypes/EverymenEditCharacter.tsx', import.meta.url)),
  'utf8',
)

/** The two corners, each under the ray fan that covers the whole sheet. */
const BURST_CORNERS = [
  ['--faction-everymen-bill-glow-gold', '--faction-everymen-bill-ray'],
  ['--faction-everymen-bill-glow-olive', '--faction-everymen-bill-ray'],
]

/** The stub's own plate (#3009) — see the archetype's header. */
const STUB_FILL = '--faction-everymen-sheet-panel'
const STUB_EDGE = '--everymen-deep-accent'
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

function burstGround(theme: Theme, stops: string[]): Rgba {
  return stops.reduce(
    (ground, token) => compositeOver(resolve(token, theme), ground),
    resolve('--everymen-paper', theme),
  )
}

/** Every ink the two edit-only slots put straight on the paper. */
const SLOT_INKS: Array<{ what: string; token: string }> = [
  {
    what: "the delete control's outline and text, and its confirm panel's rule",
    token: '--faction-everymen-card-alarm',
  },
  {
    what: "the faction row's label and the confirm prompt",
    token: '--color-text-secondary',
  },
  { what: "the faction row's help line", token: '--color-text-tertiary' },
]

describe('the two edit-only slots clear AA on the Everymen paper', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of SLOT_INKS) {
      it(`${what} — ${theme}`, () => {
        const ink = resolve(token, theme)
        for (const stops of BURST_CORNERS) {
          const ratio = contrastRatio(ink, burstGround(theme, stops))
          expect(
            ratio,
            `${token} on --everymen-paper under ${stops[0]} is ${formatRatio(ratio)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)
        }
      })
    }

    it(`the faction row's own plate carries its ink — ${theme}`, () => {
      // #3009: the row takes the stub's own well, {@link STUB_FILL}.
      for (const stops of BURST_CORNERS) {
        const well = compositeOver(resolve(STUB_FILL, theme), burstGround(theme, stops))
        const ratio = contrastRatio(resolve('--color-text-secondary', theme), well)
        expect(ratio, `the faction name is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    })

    it(`the confirm's cancel key, on that same plate — ${theme}`, () => {
      for (const stops of BURST_CORNERS) {
        const well = compositeOver(resolve(STUB_FILL, theme), burstGround(theme, stops))
        const ratio = contrastRatio(resolve('--color-text-primary', theme), well)
        expect(ratio, `the cancel key is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
      }
    })
  }
})

describe("the stub's plate edge is identifiable at 3:1 (WCAG 1.4.11, #3009)", () => {
  // 1.4.11: 3:1 against adjacent colour, of the edge when it carries the boundary.
  for (const theme of BOTH_THEMES) {
    it(`the plate edge against the paper — ${theme}`, () => {
      for (const stops of BURST_CORNERS) {
        const ratio = contrastRatio(resolve(STUB_EDGE, theme), burstGround(theme, stops))
        expect(
          ratio,
          `${STUB_EDGE} on --everymen-paper under ${stops[0]} is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_LARGE)
      }
    })

    it(`the plate edge against the well it encloses — ${theme}`, () => {
      for (const stops of BURST_CORNERS) {
        const ground = burstGround(theme, stops)
        const well = compositeOver(resolve(STUB_FILL, theme), ground)
        const ratio = contrastRatio(resolve(STUB_EDGE, theme), well)
        expect(ratio, `${STUB_EDGE} on ${STUB_FILL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_LARGE,
        )
      }
    })

    it(`the shared neutral pair would still miss 3:1 on the paper — ${theme}`, () => {
      // Why the override is a fix, not a preference.
      for (const stops of BURST_CORNERS) {
        const ground = burstGround(theme, stops)
        const neutralPlate = compositeOver(resolve(SHARED_PLATE, theme), ground)
        const fill = contrastRatio(neutralPlate, ground)
        expect(fill, `the neutral plate reads ${formatRatio(fill)}`).toBeLessThan(AA_LARGE)
        const edge = contrastRatio(
          compositeOver(resolve(SHARED_EDGE, theme), neutralPlate),
          neutralPlate,
        )
        expect(edge, `its hairline reads ${formatRatio(edge)}`).toBeLessThan(AA_LARGE)
      }
    })
  }
})

describe('keeps the measured placement in step with the archetype', () => {
  it('mounts both slots after the footer, faction row first', () => {
    const footer = ARCHETYPE.indexOf('<ComposerFooter')
    const row = ARCHETYPE.indexOf('<FactionRow')
    const del = ARCHETYPE.indexOf('<DeleteCharacter')
    expect(footer, 'the report bar is drawn').toBeGreaterThan(-1)
    expect(row, 'the faction row is mounted after the footer').toBeGreaterThan(footer)
    expect(del, 'and the destructive act after the row').toBeGreaterThan(row)
  })

  it('the plate is handed in through the dress seam, on both controls (#3009)', () => {
    expect(SLOTS, 'the shared default is still the neutral plate').toContain(`var(${SHARED_PLATE})`)
    expect(SLOTS, '…behind the neutral hairline').toContain(`var(${SHARED_EDGE})`)
    expect(ARCHETYPE, 'the stub cuts one plate for both controls').toMatch(
      /const stubPlate[\s\S]*?background: PANEL[\s\S]*?solid \$\{STUB_EDGE\}/,
    )
    expect(ARCHETYPE, 'the faction row takes it').toContain('rowStyle={stubPlate}')
    expect(ARCHETYPE, "so does the confirm's cancel key").toContain('cancelStyle={stubPlate}')
  })
})
