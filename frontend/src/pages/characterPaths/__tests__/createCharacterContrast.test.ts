/**
 * The na character forms' inks, measured on the grounds that are actually
 * behind them (#2346, #2347) — which since #2992 is TWO grounds, not one.
 *
 * ## What moved, and what did not
 *
 * `DefaultCreateCharacter` stood on bare app page under the `.na-backdrop` wash
 * until #2992 put it on `ComposerSheet`. Its ground is now
 * `--faction-default-card-bg` under the drifting aurora, and its inks moved with
 * it — so the first block below is no longer about that file. It is about
 * `DefaultEditCharacter`, which is the na kit's OTHER half and still stands on
 * the page. The second block is the create page on its new stock.
 *
 * THE FIRST BLOCK IS ONE HALF OF A PAIR. The other is the `eslint.config.js`
 * block exempting `archetypes/DefaultEditCharacter.tsx` from
 * `local/no-global-ink-on-faction-surface`. That rule reads a DIRECTORY NAME and
 * cannot see a ground, so on that one archetype it would force a swap that makes
 * the page worse; the exemption says so and this file proves it. Deleting either
 * one leaves the other lying — "the rule cannot judge this node" is never "this
 * node needs no judging". #2992 took `DefaultCreateCharacter` off that list, and
 * the row below it deleted is the one this file's second block replaces: no
 * measurement was dropped, it was re-taken on the ground the type moved to.
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

/**
 * Every ink the na EDIT-character archetype puts straight on the page, and what
 * draws it.
 *
 * The three neutral tiers, unchanged since #2537 — `DefaultEditCharacter` reads
 * all three and is the file the eslint exemption now names alone. The create
 * half read the same three on this same ground until #2992 moved it to a sheet;
 * the rows did not change, only which file they are the proof for.
 */
const PAGE_INKS: Array<{ what: string; token: string }> = [
  { what: 'heading, name field, the fields and the save bar', token: '--color-text-primary' },
  // The middle tier is measured even though the archetype reads only the outer
  // two, and that is not a stale row: the eslint block's own justification table
  // quotes 6.06 for it, and `--label-ink` — which `PortraitPicker`'s status line
  // reads on this page — is unset into this family. A number cited in prose that
  // nothing re-runs is the drift this file exists to stop.
  { what: 'the middle neutral tier the exemption table cites', token: '--color-text-secondary' },
  { what: 'character counters, @handle and the faction help', token: '--color-text-tertiary' },
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

describe('the na EDIT-character page clears AA on its washed ground', () => {
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
  // NOT ANY MORE (#2485). It never belonged to this GROUND — it was here because
  // its 4.49-flat / 3.50-washed gap was the clearest illustration of the point,
  // and since #2992 it is the create page's quiet rung on the SHEET, which is
  // the block at the foot of this file. #2485 lifted it (its consumer was
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

/**
 * THE SHEET GROUND — where the na CREATE page moved to (#2992).
 *
 * `DefaultCreateCharacter` mounts `ComposerSheet` now, so its stock is
 * `--faction-default-card-bg` with the drifting aurora washed under the content
 * column. That is the same composite `DefaultEditPraxis` stands on, and
 * `pages/editPraxis/archetypes/__tests__/composerGround.test.ts` OWNS the two
 * rows both kits share on it — `--faction-default-card-text` (headings, typed
 * values) and `--faction-default-composer-faint` (labels, counters, @handle,
 * the calling hint, the born-unaffiliated line and the exits), plus the refusal
 * of `--faction-default-card-muted`. Restating them here would be a second name
 * for one measurement, which every file in this family warns against.
 *
 * WHAT IS NEW ON THIS PAGE, AND MEASURED NOWHERE ELSE, is the ALARM ink drawn
 * BARE on that sheet: a character counter that has hit its cap, and
 * `PortraitPicker`'s error line. `factionContrast.test.ts` carries
 * `--faction-default-card-alarm` on `--faction-default-card-bg` under
 * `--color-danger-veil`, which is the error BANNER's ground — a wash of the
 * ink's own polarity, and a different reading. The composer draws no bare alarm
 * anywhere, so this page is the first to ask.
 *
 * THE AURORA IS MODELLED, NOT TRANSCRIBED. Seven radial stops, each peaking at
 * its own anchor, desaturated by `--faction-default-aurora-filter` and (in dark)
 * screen-blended, before `--faction-default-aurora-opacity` lands them on the
 * sheet. Every number is resolved out of `index.css`, so re-tuning the wash
 * re-runs the sum instead of leaving this asserting a stock nobody paints. The
 * model is the same shape `composerGround.test.ts` uses; it is spelled again
 * here rather than imported because a test file exports nothing, and because
 * this file has to stand alone as the eslint block's paired proof.
 */

const AURORA_SHEET = '--faction-default-card-bg'

function number(token: string, theme: Theme): number {
  const raw = resolveVar(token, theme, THEMES)
  const value = Number(raw)
  expect(Number.isFinite(value), `${token} is a number in ${theme}`).toBe(true)
  return value
}

/** `saturate()` as `filter` applies it, sRGB, from the SVG colour matrix. */
function saturate(colour: Rgba, s: number): Rgba {
  const channel = (r: number, g: number, b: number) =>
    r * colour.r + g * colour.g + b * colour.b
  return {
    r: channel(0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s),
    g: channel(0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s),
    b: channel(0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s),
    a: colour.a,
  }
}

/** `mix-blend-mode: screen`, which is how the aurora lifts off the night sheet. */
function screenOver(top: Rgba, back: Rgba): Rgba {
  const lift = (x: number, y: number) => 255 - ((255 - x) * (255 - y)) / 255
  return { r: lift(top.r, back.r), g: lift(top.g, back.g), b: lift(top.b, back.b), a: top.a }
}

/** The sheet with one aurora stop at its own peak — one ground per stop. */
function sheetGrounds(theme: Theme): Rgba[] {
  const sheet = resolve(AURORA_SHEET, theme)
  const alpha = number('--faction-default-aurora-opacity', theme)
  const filter = resolveVar('--faction-default-aurora-filter', theme, THEMES)
  const blend = resolveVar('--faction-default-aurora-blend', theme, THEMES)
  const aurora = resolveVar('--faction-default-aurora', theme, THEMES)
  expect(aurora, `the aurora resolves in ${theme}`).not.toBeNull()
  const amount = /saturate\(([\d.]+)\)/.exec(filter ?? '')
  expect(amount, `the aurora filter names a saturate() in ${theme}`).not.toBeNull()
  const stops = [...aurora!.matchAll(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi)]
    .map((match) => parseColor(match[0]))
    .filter((stop): stop is Rgba => stop !== null)
  expect(stops.length, `the aurora is a ramp in ${theme}`).toBeGreaterThan(1)
  return stops.map((stop) => {
    const filtered = saturate(stop, Number(amount![1]))
    const painted = blend?.trim() === 'screen' ? screenOver(filtered, sheet) : filtered
    return compositeOver({ ...painted, a: alpha }, sheet)
  })
}

const worstOn = (ink: Rgba, grounds: Rgba[]): number =>
  Math.min(...grounds.map((ground) => contrastRatio(ink, ground)))

describe('the na create page clears AA on the sheet it moved to (#2992)', () => {
  it.each(BOTH_THEMES)('the alarm ink, bare on the aurora-washed sheet — %s', (theme) => {
    const ratio = worstOn(resolve('--faction-default-card-alarm', theme), sheetGrounds(theme))
    expect(
      ratio,
      `--faction-default-card-alarm on the composite is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  // The refusal, and it is the one the page ground already recorded: the neutral
  // functional red is what a naive fix reaches for, and it misses here too. If
  // it is ever walked far enough to clear, this row goes red and the archetype
  // can go back to the platform ink — which is the outcome worth catching.
  it('and the neutral --color-danger still would not — light', () => {
    const ratio = worstOn(resolve('--color-danger', 'light'), sheetGrounds('light'))
    expect(ratio, `--color-danger on the composite is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })

  // The guard that makes the rows above mean something. If the composite were
  // ever LIGHTER (in light) than the bare sheet for this ink, measuring it would
  // be the optimistic reading and the whole block would prove the wrong thing.
  it.each(BOTH_THEMES)('the wash is the tighter reading, not the flatterer — %s', (theme) => {
    const ink = resolve('--faction-default-card-alarm', theme)
    const flat = contrastRatio(ink, resolve(AURORA_SHEET, theme))
    const washed = worstOn(ink, sheetGrounds(theme))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})
