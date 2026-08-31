/**
 * The three things the UA propose leaf introduces that its create twin did not
 * (#2538).
 *
 * MOST OF THIS DRESS IS ALREADY MEASURED AND IS DELIBERATELY NOT RE-MEASURED.
 * The sheet, the lotus wash and every ink standing on them are
 * `uaCreateCharacterContrast.test.ts`'s subject — the heading, the quiet tier's
 * choice of `-card-body` over `-card-muted`, the cast band's fill pair and the
 * error banner under its veil. The fields' own inks land on
 * `--faction-ua-panel`, which is an opaque token laid OVER the wash, and every
 * one of those pairings is in `factionContrast.test.ts`'s sun-bleached block
 * ("ua panel, ink / prose / muted / accent"). Restating either set would be a
 * second name for one measurement, which that file spends a paragraph warning
 * against.
 *
 * What is left is the delta, and it is three rows:
 *
 *  1. THE TRAIL, which stands on the SITE's page rather than on the leaf. The na
 *     kit draws it in the app's own tertiary ink; this kit draws it in its own
 *     quiet tier, and the tier arm's whole point is that a faction ink on a
 *     ground it was not measured against is where this goes wrong. The route
 *     declares no faction backdrop — `useFactionBackdrop` has exactly one caller
 *     and it is `CharacterProfile` — so the ground is `--color-bg-page` under
 *     the neutral spectrum wash, the same composite the na kit's own tails are
 *     measured on.
 *
 *  2. THE PREVIEW'S CREDIT LINE. A bonus is a credit and the kit has a name for
 *     that rung, so the strip reads `--faction-ua-card-credit` where the na kit
 *     reads the global `--color-success`. That is a new pairing: the panel
 *     carries this family's ink / prose / muted / accent rows already and has
 *     never carried its credit.
 *
 *  3. THE LEVEL ROW, which is the load-bearing one — it measures the control
 *     this archetype did NOT mount. `FilterLevelNodes` is site chrome standing
 *     on `--color-bg-surface`, a TRANSLUCENT token in both cascades, so on this
 *     leaf it takes the warm stock underneath rather than the app's own. The
 *     same shape as `uaEditCharacterContrast.test.ts`'s rejected placement, with
 *     one difference that decides the outcome: an irreversible act can be moved
 *     off the sheet, and a field the form asks for cannot. So the row is redrawn
 *     in the kit's inks, and if the shared control ever clears this ground the
 *     redraw is dead weight — which is what the failing row below would say.
 *
 * THE WASH IS READ FROM THE STYLESHEET, NOT TRANSCRIBED, for the reason the
 * sibling file records: repaint a stop and this file measures the new one.
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
 * `[data-theme="dark"]` override, which repaints every stop. Each stop is its
 * own corner-anchored radial, so they do not stack — every one is composited
 * alone and all of them must clear.
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

/** The page stock with one wash stop over it — the ground the trail stands on. */
function pageUnderWash(theme: Theme, stop: string): Rgba {
  const wash = parseColor(stop)
  expect(wash, `${stop} parses`).not.toBeNull()
  return compositeOver(wash!, resolve('--color-bg-page', theme))
}

/** The sheet under the ornament layer — what a mark on the leaf really sits on. */
function washedLeaf(theme: Theme): Rgba {
  const alpha = Number(resolveVar('--faction-ua-card-lotus-opacity', theme, THEMES))
  expect(alpha, `the lotus opacity is a number in ${theme}`).toBeGreaterThan(0)
  return compositeOver(
    { ...resolve('--faction-ua-card-lotus', theme), a: alpha },
    resolve('--faction-ua-card-bg', theme),
  )
}

describe('the trail above the leaf carries the kit ink on the SITE ground', () => {
  const TRAIL_INKS: Array<{ what: string; token: string }> = [
    { what: 'the Tasks crumb', token: '--faction-ua-card-body' },
    { what: 'the current page', token: '--faction-ua-card-text' },
  ]
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of TRAIL_INKS) {
      it(`${what} — ${theme}`, () => {
        for (const stop of washStops(theme)) {
          const ratio = contrastRatio(resolve(token, theme), pageUnderWash(theme, stop))
          expect(ratio, `${token} over ${stop} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
            AA_NORMAL,
          )
        }
      })
    }
  }
})

describe("the preview's bonus line reads the kit's own credit rung", () => {
  it.each(BOTH_THEMES)('%s', (theme) => {
    // The strip is `--faction-ua-panel`, opaque and laid over the wash, so this
    // is the flat pairing rather than a composite.
    const ratio = contrastRatio(
      resolve('--faction-ua-card-credit', theme),
      resolve('--faction-ua-panel', theme),
    )
    expect(
      ratio,
      `--faction-ua-card-credit on the well is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})

describe('and the level row is drawn here because the shared one could not stand on the leaf', () => {
  it('FilterLevelNodes would miss AA on the leaf in dark', () => {
    // THE NODE, NOT THE INK. `--color-bg-surface` is translucent in both
    // cascades, so the control takes this leaf's warm stock rather than the
    // app's own page, and its resting `--color-text-secondary` lands under AA on
    // the composite. The shared component takes no paint props, and a field the
    // form asks for cannot be moved off the sheet the way an irreversible act
    // can, so the archetype redraws the circle in its own inks.
    const node = compositeOver(resolve('--color-bg-surface', 'dark'), washedLeaf('dark'))
    const ratio = contrastRatio(resolve('--color-text-secondary', 'dark'), node)
    expect(ratio, `the level node's ink on the leaf is ${formatRatio(ratio)}`).toBeLessThan(
      AA_NORMAL,
    )
  })

  it('and clears it in light, so this is a dark-only miss and invisible to a light-only check', () => {
    const node = compositeOver(resolve('--color-bg-surface', 'light'), washedLeaf('light'))
    const ratio = contrastRatio(resolve('--color-text-secondary', 'light'), node)
    expect(ratio, `the level node's ink on the leaf is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

describe('keeps the grounds in step with the archetype', () => {
  // Transcribed grounds rot. Everything above is only the real ground for as
  // long as the archetype still washes the leaf with these two tokens and still
  // declines the shared level control; change either and the measurement must be
  // re-run rather than silently keep asserting the old stock.
  const source = readFileSync(
    fileURLToPath(new URL('../archetypes/UaProposeTask.tsx', import.meta.url)),
    'utf8',
  )

  it('still washes its ground with the tokens the create leaf measures', () => {
    expect(source).toContain('var(--faction-ua-card-lotus)')
    expect(source).toContain('var(--faction-ua-card-lotus-opacity)')
  })

  it('draws its own level row rather than mounting the shared control', () => {
    // The IMPORT PATH, not the name: the archetype names the component in prose
    // to say why it declines it, and a guard that read the name would go red on
    // its own explanation.
    expect(source).not.toContain('ui/FilterLevelNodes')
  })
})
