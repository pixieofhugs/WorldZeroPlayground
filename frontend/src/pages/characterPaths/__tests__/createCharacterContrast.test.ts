/**
 * The na character forms' inks, measured on the grounds that are actually
 * behind them (#2346, #2347) — which since #2992 is TWO grounds, not one.
 *
 * ## What moved, and what did not
 *
 * Both na character forms stood on bare app page under the `.na-backdrop` wash
 * until the chassis pass: #2992 put `DefaultCreateCharacter` on `ComposerSheet`
 * and #2991 put `DefaultEditCharacter` there beside it. Their ground is
 * `--faction-default-card-bg` under the drifting aurora now, and their inks
 * moved with it — the second block at the foot of this file is that ground, and
 * `pages/editPraxis/archetypes/__tests__/composerGround.test.ts` owns the two
 * quiet rows both kits share on it.
 *
 * SO WHO IS THE FIRST BLOCK FOR? `editCharacterSlots`'s UNDRESSED DEFAULTS.
 * That file draws the faction row's label, its ink and the confirm prompt in
 * `--color-text-secondary`, its chevron and help line in `-tertiary`, the
 * confirm's cancel key in `-primary`, and its destructive ink in
 * `--faction-default-card-alarm` — the same four this block resolves — and its
 * own ponytail names the ground they were measured on: *"the alarm ink is
 * measured on the na page's washed ground only"*. Every kit that lands those
 * slots on its own sheet hands them a dress and owes its own measurement
 * (`everymenEditCharacterContrast.test.ts` is one; the na kit's dress is in
 * `DefaultEditCharacter` itself since #2991). This block is the BASELINE those
 * departures are measured against, and what a ninth kit falls back to on the day
 * it passes no dress at all.
 *
 * THE ESLINT EXEMPTION THIS BLOCK WAS PAIRED WITH IS GONE, and that is the same
 * fact rather than a second one. `local/no-global-ink-on-faction-surface` reads
 * a DIRECTORY NAME and could not see this ground, so it was switched off for the
 * two `na` archetypes while they stood on it; both moved, neither reads a global
 * tier now, and #2991 deleted the block. NO MEASUREMENT WENT WITH IT — the rows
 * are still here, and the comment left in `eslint.config.js` says so and points
 * back. "The rule cannot judge this node" is never "this node needs no judging",
 * and neither is "the rule has no node left to judge".
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
 * Every ink `editCharacterSlots` puts straight on the app page when the
 * archetype mounting it passes no dress, and what draws it.
 *
 * The three neutral tiers plus the alarm, unchanged since #2537. What changed
 * twice is which file they are the proof FOR: the na CREATE kit's until #2992,
 * the na EDIT kit's until #2991, and the shared slots' defaults now that both
 * kits are on the composer sheet. The rows themselves did not move, so nothing
 * was re-derived to keep them passing.
 */
const PAGE_INKS: Array<{ what: string; token: string }> = [
  { what: "the confirm panel's cancel key", token: '--color-text-primary' },
  // The middle tier is the slots' busiest, and it is measured here rather than
  // read off `--label-ink`: that seam is unset into this family at root, so the
  // label, the row's ink and the confirm prompt are all one tier off it and
  // would MOVE on every ground. `editCharacterSlots`'s header states that split
  // in as many words; a number cited in prose that nothing re-runs is the drift
  // this file exists to stop.
  { what: 'the faction row label, its ink and the confirm prompt', token: '--color-text-secondary' },
  { what: "the row's chevron and the faction help line", token: '--color-text-tertiary' },
  // NOT `--color-danger`, which is what this slot used to draw and which fails
  // here at 3.42:1 in light. See `editCharacterSlots`'s own note: the functional
  // red inside a faction frame takes that faction's card alarm (#1302), and for
  // an undressed mount `factionCssVar(slug, 'card-alarm')` resolves to this one.
  { what: "the delete outline's hairline and label", token: '--faction-default-card-alarm' },
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

describe('the shared edit slots clear AA on the washed page, undressed', () => {
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
  /**
   * THE CALLING ROWS, AND WHY THIS ROW IS NOT A RESTATEMENT.
   *
   * The picker's faction names are `--faction-default-card-muted` on
   * `--faction-default-composer-field` — and `composerGround.test.ts` certifies
   * that same token as the REFUSED, sub-AA rung on the sheet one layer below it.
   * Two grounds, two answers, six millimetres apart on screen: that is precisely
   * the pairing a reader of this page will get wrong, and a refusal certified
   * next door is not a licence to assume the neighbouring ground fails too.
   *
   * The field is opaque in both cascades, which is what makes the two grounds
   * genuinely different rather than one wash apart — asserted below rather than
   * asserted in prose, because if it ever gained an alpha the aurora would reach
   * the calling names and this measurement would silently become the optimistic
   * one.
   *
   * It clears comfortably — 6.05:1 by day and 5.23:1 by night, against the
   * sheet's 3.27–4.30 for the same ink. The gap IS the finding: this token is
   * not "too quiet for na", it is too quiet for na's WASHED ground, and the
   * opaque field is where it was always right.
   *
   * `factionContrast.test.ts` carries this pairing under the COMPOSER's name
   * ("na composer field, prose"). It is restated here, against the file's own
   * rule about second names for one measurement, because the create page is the
   * only surface that draws this ink beside its own refusal — and a reader who
   * follows the refusal and repaints the calling rows has broken nothing that
   * goes red.
   */
  it.each(BOTH_THEMES)('the calling names, on the opaque field — %s', (theme) => {
    const field = resolve('--faction-default-composer-field', theme)
    expect(field.a, 'the field grounds the calling rows opaquely').toBe(1)
    const ratio = contrastRatio(resolve('--faction-default-card-muted', theme), field)
    expect(
      ratio,
      `--faction-default-card-muted on --faction-default-composer-field is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

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
