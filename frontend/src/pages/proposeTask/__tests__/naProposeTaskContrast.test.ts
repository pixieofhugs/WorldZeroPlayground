/**
 * The na propose form, measured on the ground it MOVED TO (#2993).
 *
 * ## Why this file exists at all
 *
 * Until #2993 this page was a `.sidebar-card` on the app's own washed page, and
 * every ink on it was one of the global `--color-text-*` tiers — which is what
 * bought it a line in `.eslint-legacy-faction-ink.txt`. The rebuild puts it on
 * `ComposerSheet`: the stock is `--faction-default-card-bg` with the drifting
 * aurora washed under the content column, and that is a different measurement
 * with different answers. Three inks could not come with it, and one whole
 * CLASS of control could not either.
 *
 * ## What is measured HERE and what is measured next door
 *
 * Only the pairings this page is the first to draw. Restating a ratio is how
 * two files come to disagree about one measurement, and this family has red-
 * mained `main` twice that way:
 *
 *  - `--faction-default-card-text` (headings, typed values) and
 *    `--faction-default-composer-faint` (labels, counters, the exits) on the
 *    washed sheet, plus the refusal of `--faction-default-card-muted` there:
 *    `pages/editPraxis/archetypes/__tests__/composerGround.test.ts`.
 *  - `--faction-default-card-muted` on the opaque well, and
 *    `--faction-default-card-alarm` bare on the washed sheet with
 *    `--color-danger`'s refusal beside it:
 *    `pages/characterPaths/__tests__/createCharacterContrast.test.ts`.
 *  - the 1.4.11 EDGE of every well on this stock, both sides, both cascades:
 *    `pages/characterPaths/__tests__/defaultEditCharacterEdges.test.ts`. This
 *    file asserts only that the propose archetype draws the SAME token, so
 *    those ratios are about this page too rather than about a line nothing here
 *    renders.
 *
 * What is left, and what is below: the two APP-CHROME control rows this page
 * mounts and no other na surface does, the counter's approach rung, and the
 * preview chit's one functional hue.
 *
 * ## The aurora is modelled, not transcribed
 *
 * Seven radial stops, each peaking at its own anchor, desaturated by
 * `--faction-default-aurora-filter` and (in dark) screen-blended, before
 * `--faction-default-aurora-opacity` lands them on the sheet. Every number is
 * resolved out of `index.css`, so re-tuning the wash re-runs the sum instead of
 * leaving this asserting a stock nobody paints. The model is spelled again here
 * rather than imported for the reason its three siblings give: a test file
 * exports nothing, and this one has to stand alone as the archetype's proof.
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

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

const source = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

/**
 * The archetype with its prose removed.
 *
 * Every "does not draw X" row below is about CODE, and this file's own subject
 * explains at length which inks it left and why — so a raw substring scan finds
 * `--color-warning` in the sentence that says it was refused and reports the
 * opposite of the truth. Comments are stripped once, here, rather than each row
 * being written to dodge its own explanation.
 */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const ARCHETYPE = code(source('../archetypes/DefaultProposeTask.tsx'))
const CHIP = source('../../../components/ui/ChipRow.tsx')
const NODES = source('../../../components/ui/FilterLevelNodes.tsx')

const SHEET = '--faction-default-card-bg'
/** The opaque plate the two app-chrome rows stand on. */
const WELL = '--faction-default-composer-field'
/** The edge `defaultEditCharacterEdges.test.ts` measures, both sides. */
const EDGE = '--faction-default-card-muted'

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

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
  const sheet = resolve(SHEET, theme)
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

/* ========================================================================== *
 * THE TWO APP-CHROME ROWS, AND THE WELL UNDER THEM
 *
 * `Chip` (the target-faction radiogroup) and `FilterLevelNodes` (the minimum
 * level) are SITE chrome: they paint `--color-bg-surface` — translucent in both
 * cascades — with the global `--color-text-primary` / `-secondary` tiers, and
 * neither takes a style hook. #2993 mounts them rather than re-drawing them,
 * which is what keeps them one control across nine kits.
 *
 * Straight on the composer sheet that is a ground those neutrals were never
 * measured on, and in dark it fails: the aurora's screen blend LIFTS the night
 * stock at each stop, a translucent white pill lifts it again, and `Chip` then
 * fades an unselected pill to 0.88 — three liftings, and the label lands under
 * AA. So both rows stand on the na dress's own OPAQUE well, which the aurora
 * cannot reach.
 *
 * Both directions are asserted. The ink that IS used has to clear on the well,
 * and the same ink has to still MISS on the sheet — walk the second one far
 * enough to clear and the well is decoration, at which point the rows can be
 * simplified, which is the outcome worth catching.
 * ========================================================================== */

/** `Chip`'s own fade for an unselected pill, read rather than transcribed. */
const CHIP_FADE = 0.88

/** The whole element at `alpha` over what is behind it — CSS `opacity`. */
const faded = (colour: Rgba, behind: Rgba): Rgba =>
  compositeOver({ ...colour, a: CHIP_FADE }, behind)

describe('the app-chrome rows stand on a well, and it is load-bearing', () => {
  it('the archetype mounts the shared controls rather than re-drawing them', () => {
    expect(ARCHETYPE, 'the shared chip').toContain('<Chip')
    expect(ARCHETYPE, 'the shared level row').toContain('<FilterLevelNodes')
  })

  it('and stands both of them on the na well', () => {
    // Two mounts, one well style. If a later edit drops the wrapper from either
    // row, the rows below are measuring a ground that page no longer draws.
    expect(ARCHETYPE, 'the well is declared once').toContain(`background: FIELD`)
    expect(ARCHETYPE.split('wellStyle').length - 1, 'declared once, spread three times').toBe(4)
  })

  it('the two controls still paint the global tiers this file measures', () => {
    // The premise. These are somebody else's components; if either stopped
    // reading `--color-bg-surface` or the neutral tiers, every ratio below
    // would be about paint that is no longer there.
    for (const [what, code] of [['Chip', CHIP], ['FilterLevelNodes', NODES]] as const) {
      expect(code, `${what} grounds itself on the app surface`).toContain('var(--color-bg-surface)')
      expect(code, `${what} inks the loud tier`).toContain('var(--color-text-primary)')
      expect(code, `${what} inks the quiet tier`).toContain('var(--color-text-secondary)')
    }
    expect(
      CHIP.split(String(CHIP_FADE)).length - 1,
      `Chip fades an unselected pill exactly once, at ${CHIP_FADE}`,
    ).toBe(1)
  })

  it.each(BOTH_THEMES)('the well is opaque, so the aurora never reaches them — %s', (theme) => {
    // What makes the well a different ground rather than one wash apart. If it
    // ever gained an alpha, every row below would silently become the
    // optimistic reading.
    expect(resolve(WELL, theme).a, 'the well grounds the controls opaquely').toBe(1)
  })

  for (const theme of BOTH_THEMES) {
    const chipGround = (t: Theme) => compositeOver(resolve('--color-bg-surface', t), resolve(WELL, t))

    it(`the picked chip and the active level node clear AA on the well — ${theme}`, () => {
      const ratio = contrastRatio(resolve('--color-text-primary', theme), chipGround(theme))
      expect(ratio, `--color-text-primary on the well is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      )
    })

    it(`an unpicked chip and an inactive node clear it too — ${theme}`, () => {
      // The quiet tier AND `Chip`'s 0.88 fade, which is the tightest of the four
      // states this row draws: the label fades toward its own ground, and the
      // ground fades toward the well.
      const ground = chipGround(theme)
      const well = resolve(WELL, theme)
      const flat = contrastRatio(resolve('--color-text-secondary', theme), ground)
      const dimmed = contrastRatio(
        faded(resolve('--color-text-secondary', theme), well),
        faded(ground, well),
      )
      expect(flat, `flat on the well is ${formatRatio(flat)}`).toBeGreaterThanOrEqual(AA_NORMAL)
      expect(
        dimmed,
        `an unpicked chip at ${CHIP_FADE} is ${formatRatio(dimmed)}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL)
    })
  }

  it('and on the bare sheet the same chip would MISS — dark', () => {
    // The defect the well prevents, kept as a live row rather than as prose:
    // 3.55:1 at the worst aurora stop. Light is not the miss (5.80), which is
    // why this reads dark only — a light-only check would have shipped it.
    const grounds = sheetGrounds('dark')
    const ink = resolve('--color-text-secondary', 'dark')
    const dimmed = Math.min(
      ...grounds.map((ground) =>
        contrastRatio(
          faded(ink, ground),
          faded(compositeOver(resolve('--color-bg-surface', 'dark'), ground), ground),
        ),
      ),
    )
    expect(
      dimmed,
      `an unpicked chip straight on the washed sheet is ${formatRatio(dimmed)} — if this now ` +
        'clears, the well is decoration and the archetype can drop it',
    ).toBeLessThan(AA_NORMAL)
  })
})

/* ========================================================================== *
 * THE COUNTER'S TWO RUNGS (#1609)
 *
 * A counter that turns colour as it APPROACHES a limit is a warning; the
 * over-length message at the cap is an error. Both tiers survive the move — in
 * na's own family, because both of the app's functional inks miss on this sheet.
 * ========================================================================== */

describe('the counter keeps both of #1609’s rungs, in na’s family', () => {
  it('the archetype draws the notice rung and no `.warning-text`', () => {
    expect(ARCHETYPE, 'the approach rung').toContain('--faction-default-card-notice')
    expect(ARCHETYPE, 'the app class it left').not.toContain('warning-text')
    expect(ARCHETYPE, 'and the app ink under it').not.toContain('--color-warning')
  })

  it.each(BOTH_THEMES)('the approach rung clears AA on the washed sheet — %s', (theme) => {
    const ratio = worstOn(resolve('--faction-default-card-notice', theme), sheetGrounds(theme))
    expect(
      ratio,
      `--faction-default-card-notice on the composite is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  it('and the app’s own `--color-warning` still would not — light', () => {
    // The ink this page moved OFF, and the reason it had to. Walk it far enough
    // to clear and the archetype can go back to `.warning-text`, which is the
    // outcome worth catching. Dark was never the miss (6.14), the same shape
    // `--color-danger` has one rung down.
    const ratio = worstOn(resolve('--color-warning', 'light'), sheetGrounds('light'))
    expect(ratio, `--color-warning on the composite is ${formatRatio(ratio)}`).toBeLessThan(
      AA_NORMAL,
    )
  })

  it.each(BOTH_THEMES)('the wash is the tighter reading, not the flatterer — %s', (theme) => {
    // The guard that makes the rows above mean something: if the composite were
    // ever lighter (in light) or darker (in dark) than the bare sheet for this
    // ink, measuring it would be the optimistic reading.
    const ink = resolve('--faction-default-card-notice', theme)
    const flat = contrastRatio(ink, resolve(SHEET, theme))
    const washed = worstOn(ink, sheetGrounds(theme))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})

/* ========================================================================== *
 * THE PREVIEW CHIT
 * ========================================================================== */

describe('the live preview reads on the plate it moved onto', () => {
  it.each(BOTH_THEMES)('the bonus line’s success hue, on the well — %s', (theme) => {
    // The one app functional hue this page keeps. It is a HUE and not a
    // `--color-text-*` tier, it is what a metatask's bonus has always been
    // drawn in, and on the opaque well it clears with room — so it moves house
    // with the chit rather than being dropped the way Coven dropped it onto
    // ward paper it had no reading on.
    const ratio = contrastRatio(resolve('--color-success', theme), resolve(WELL, theme))
    expect(ratio, `--color-success on the well is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

/* ========================================================================== *
 * THE EDGE, WHICH IS MEASURED NEXT DOOR
 * ========================================================================== */

describe('every plate on this sheet takes the edge #2991 measured', () => {
  it('the archetype draws that token and not the 12% hairline', () => {
    // `defaultEditCharacterEdges.test.ts` owns the ratios — the same token, the
    // same well, the same aurora-washed sheet, 4.30 / 3.27 outside and
    // 6.05 / 5.23 inside, both clearing 1.4.11's 3:1. What this row adds is that
    // THIS page draws it, so that measurement is about this page too.
    expect(ARCHETYPE, 'the edge is declared once, off the mark rung').toContain(
      `const EDGE = MUTED`,
    )
    expect(ARCHETYPE, 'and MUTED is the token that file measures').toContain(`var(${EDGE})`)
    expect(
      ARCHETYPE,
      'the 12% hairline is 1.31:1 against a well the same colour as its sheet',
    ).not.toContain('--faction-default-border')
  })
})
