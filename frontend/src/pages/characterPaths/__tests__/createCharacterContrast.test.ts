/**
 * Character creation's inks, measured on the ground that is actually behind
 * them (#2346, #2347).
 *
 * THIS FILE IS ONE HALF OF A PAIR. The other is the `eslint.config.js` block
 * exempting `archetypes/DefaultCreateCharacter.tsx` from
 * `local/no-global-ink-on-faction-surface`. That rule reads a DIRECTORY NAME and
 * cannot see a ground, so on this one archetype it would force a swap that makes
 * the page worse; the exemption says so and this file proves it. Deleting either
 * one leaves the other lying — "the rule cannot judge this node" is never "this
 * node needs no judging".
 *
 * WHY IT MEASURES THE COMPOSITE. `--color-bg-page` is not what is behind this
 * type. `.na-backdrop` paints that colour and then washes five radial gradients
 * over it, and a flat-token reading is optimistic by up to a full ratio point:
 * `--faction-default-composer-faint` reads 4.49 against the bare token and 3.50
 * under the red stop. Measuring the declared token rather than the composite is
 * exactly the failure mode the acceptance criterion names.
 *
 * WHAT IS NOT MEASURED HERE, deliberately. The Ephemerists archetype draws every
 * one of its strings inside `ComposerSheet`, on the plate — so its pairings are
 * `-plate-*` on `-plate-bg` / `-plate-inner`, and `factionContrast.test.ts`
 * already carries every one of them (plate ink/caption/quiet, panel cell
 * ink/quiet, the CTA pair, the masthead band, and the error banner under the
 * danger veil). Restating them here would be a second name for one measurement,
 * which that file warns against in as many words.
 */
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

/**
 * The `.na-backdrop` wash stops, per theme, transcribed from `index.css`.
 *
 * Each is its own radial gradient peaking at its own corner, so they do not
 * stack — the honest worst case is the single stop that costs the most, applied
 * alone. Transcribed rather than parsed because the rule is a five-gradient
 * `background-image` shorthand, and a parser for it would be more code than the
 * thing it reads; `keeps the wash list in step with the stylesheet` below fails
 * if a stop is ever added, removed or repainted.
 */
const WASH: Record<Theme, string[]> = {
  light: [
    'rgba(193,39,45,0.16)',
    'rgba(202,138,4,0.15)',
    'rgba(37,99,235,0.16)',
    'rgba(190,24,93,0.15)',
    'rgba(22,163,74,0.15)',
  ],
  dark: [
    'rgba(239,83,80,0.14)',
    'rgba(230,185,79,0.12)',
    'rgba(96,165,250,0.14)',
    'rgba(244,114,182,0.12)',
    'rgba(74,222,128,0.12)',
  ],
}

/** Every ink the na archetype puts straight on the page, and what draws it. */
const PAGE_INKS: Array<{ what: string; token: string }> = [
  { what: 'heading, name field and picker name', token: '--color-text-primary' },
  { what: 'eyebrow labels, back link and cancel', token: '--color-text-secondary' },
  { what: 'character counters, @handle and the born-unaffiliated help', token: '--color-text-tertiary' },
  // NOT `--color-danger`, which is what this page used to draw and which fails
  // here at 3.42:1 in light. See the archetype's own note: the functional red
  // inside a faction frame takes that faction's card alarm (#1302).
  { what: 'the error box and a counter at its cap', token: '--faction-default-card-alarm' },
]

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** The page stock with one wash stop over it — the ground type actually lands on. */
function washedGround(theme: Theme, stop: string): Rgba {
  return compositeOver(parseColor(stop)!, resolve('--color-bg-page', theme))
}

describe('the na create page clears AA on its washed ground', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of PAGE_INKS) {
      it(`${what} — ${theme}`, () => {
        const ink = resolve(token, theme)
        for (const stop of WASH[theme]) {
          const ground = washedGround(theme, stop)
          const ratio = contrastRatio(ink, ground)
          expect(
            ratio,
            `${token} on --color-bg-page under ${stop} is ${formatRatio(ratio)}`,
          ).toBeGreaterThanOrEqual(AA_NORMAL)
        }
      })
    }
  }
})

describe('the faction-default TEXT family is not the answer on this ground', () => {
  // Note the split this records, which is the whole subtlety of the surface: the
  // card ALARM is right here (it clears where `--color-danger` does not) and the
  // card TEXT tiers are not (they miss where the neutrals clear). One family is
  // not uniformly the answer, so both halves are measured rather than assumed.
  // The load-bearing half of the lint exemption: this records WHY the swap the
  // tier rule would force is refused, as a measurement rather than as prose. If
  // either token is ever walked far enough to clear the wash, this row goes red
  // and the exemption can be reconsidered — which is the outcome worth catching.
  //
  // `--faction-default-composer-faint` WAS THE SECOND MEMBER OF THIS LIST AND IS
  // NOT ANY MORE (#2485). It never belonged to this page — no `characterPaths`
  // file reads it; it was here because its 4.49-flat / 3.50-washed gap was the
  // clearest illustration of the point. #2485 lifted it (its only consumer is
  // `DefaultEditPraxis`, whose sheet is washed by the aurora and where the whole
  // quiet ladder was under AA), and at #5f5b53 it reads 4.79 on this ground, so
  // the row it used to fill would now be asserting something false. The
  // refusal it recorded is intact: `-card-muted` is a real member of the na
  // TEXT family, it is what this archetype would be forced onto, and it still
  // misses at 4.36. The eslint block's table is updated to match.
  it.each(['--faction-default-card-muted'])(
    '%s still misses AA in light, so the neutral tier stays',
    (token) => {
      const ink = resolve(token, 'light')
      const worst = Math.min(
        ...WASH.light.map((stop) => contrastRatio(ink, washedGround('light', stop))),
      )
      expect(worst, `${token} worst-case is ${formatRatio(worst)}`).toBeLessThan(AA_NORMAL)
    },
  )
})

describe('keeps the wash list in step with the stylesheet', () => {
  // Transcribed constants rot. This is the guard that makes the numbers above
  // mean something: repaint a stop in `index.css` and the measurement must be
  // re-run rather than silently keep asserting the old ground.
  const css = readIndexCss()

  it.each(BOTH_THEMES)('%s names exactly the stops this file measures', (theme) => {
    const block = theme === 'light'
      ? css.slice(css.indexOf('.na-backdrop'), css.indexOf('[data-theme="dark"] .na-backdrop'))
      : css.slice(css.indexOf('[data-theme="dark"] .na-backdrop'))
    const stops = [...block.matchAll(/rgba\([^)]*\)/g)]
      .map((m) => m[0].replace(/\s+/g, ''))
      .slice(0, WASH[theme].length)
    expect(stops).toEqual(WASH[theme])
  })
})
