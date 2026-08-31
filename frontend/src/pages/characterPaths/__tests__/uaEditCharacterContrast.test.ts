/**
 * Where the UA edit leaf puts its two shared slots, and why (#2537).
 *
 * THIS IS THE MEASUREMENT THE FAN-OUT IS EXPECTED TO SKIP. `editCharacterSlots`
 * carries a `ponytail:` note saying the alarm ink is measured on the na page's
 * washed ground only, and that a faction archetype landing the slot on its own
 * SHEET owes a re-measurement against that sheet. `UaEditCharacter` does not
 * land it on the sheet — and that is a finding rather than a convenience, which
 * is what the second block below pins.
 *
 * ## What the slot actually paints, and on what
 *
 * `FactionRow` draws its row on `--color-bg-surface-alt` and its label and help
 * in `--color-text-secondary` / `--color-text-tertiary`; `DeleteCharacter` draws
 * its resting outline in `factionCssVar(slug, 'card-alarm')`, which for this
 * archetype is `--faction-ua-card-alarm` rather than the na token every shipped
 * row was measured with. Same ground, different ink — a new pairing, and the
 * first block measures it.
 *
 * The ground is the app's own page. `/characters/:id/edit` declares no faction
 * backdrop (`useFactionBackdrop` has exactly two callers, and neither is on this
 * route), so the stock under the tail is `--color-bg-page` beneath the neutral
 * spectrum wash — the same composite `createCharacterContrast.test.ts` measures
 * the na kit's own tail on.
 *
 * THE WASH IS READ FROM THE STYLESHEET, NOT TRANSCRIBED. Its sibling file
 * copies the five `.na-backdrop` stops into a literal and keeps a separate row
 * to catch the copy rotting. Reading them back out of `index.css` is fewer lines
 * than that pair and cannot rot at all: repaint a stop and this file measures
 * the new one. Each stop is its own corner-anchored radial, so they do not
 * stack — every one is composited alone and all of them must clear.
 *
 * ## The second block is the load-bearing one
 *
 * It measures the placement that was REJECTED. Mounting `FactionRow` inside the
 * leaf would put its 6%-white row over UA's warm dark stock, where the row's own
 * ink lands under AA — so the tail sits below the sheet instead, which is also
 * where `DefaultEditCharacter`'s desktop branch puts it. If that row ever
 * clears, the constraint is gone and the tail is free to move onto the leaf;
 * this file is what would say so.
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

const INDEX_CSS = readIndexCss()
const THEMES = readThemes(INDEX_CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/**
 * The spectrum wash's stops for one theme, read out of the rule that paints
 * them. Light is the bare `.na-backdrop` block; dark is the
 * `[data-theme="dark"]` override, which repaints every stop.
 */
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
  // The one genuinely new pairing this archetype introduces: the slot takes the
  // EDITED character's alarm, so a UA life gets UA's ink where the shipped
  // measurement used na's.
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

    it(`the faction row's own box carries its ink — ${theme}`, () => {
      // `--color-bg-surface-alt` is TRANSLUCENT in dark (6% white), so the row's
      // ground is whatever is under it. Here that is the washed page.
      for (const stop of washStops(theme)) {
        const row = compositeOver(resolve('--color-bg-surface-alt', theme), pageUnderWash(theme, stop))
        const ratio = contrastRatio(resolve('--color-text-secondary', theme), row)
        expect(ratio, `the faction name over ${stop} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        )
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
    // THE ROW, NOT THE INK. `--faction-ua-card-alarm` clears the washed leaf
    // comfortably (`uaCreateCharacterContrast.test.ts` measures it there), so a
    // reader could reasonably assume the whole tail may sit on the sheet. What
    // fails is `FactionRow`'s BOX: `--color-bg-surface-alt` is a 6% white wash,
    // it takes the leaf's warm dark stock rather than the page's near-black, and
    // the row's own `--color-text-secondary` lands under AA on the composite.
    // The slot is shared and this PR may not redraw it, so the archetype moved.
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
  // Transcribed grounds rot. Everything above is only the real ground for as
  // long as the archetype still mounts both slots BELOW the sheet; move either
  // one inside `ComposerSheet` and the measurement must be re-run rather than
  // silently keep asserting the old stock.
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
})
