/**
 * THE na EDIT SHEET'S CONTROL EDGES — WCAG 1.4.11, not 1.4.3 (#2991).
 *
 * Every other contrast file on this surface asks about INK. This one asks about
 * the line around a control, which is a different success criterion with a
 * different floor (3:1, {@link AA_LARGE}) and a different pair of grounds — and
 * it is the criterion the na kit failed the moment #2991 moved it onto a sheet.
 *
 * ## Why the sheet made it fail
 *
 * `--faction-default-composer-field` is `#fffdf9` in light. So is
 * `--faction-default-card-bg`. The well and the stock it is laid on are the
 * SAME COLOUR — 1.00:1, and 1.04:1 in dark — so a field, the picker's button,
 * the faction row's plate and the confirm's cancel key have no fill of their own
 * to be seen by. The hairline is the whole boundary, and
 * `--faction-default-border` at 12% ink reads 1.31:1 against the well and
 * 1.30:1 against the worst aurora stop.
 *
 * That is the same shape #3010 fixed on the WOW codicil, arrived at from the
 * other direction: WOW put the shared slot on a sheet whose stock the plate did
 * not clear, and na put its own wells on a sheet whose stock they MATCH.
 *
 * ## The two grounds, and why both
 *
 * An edge has a ground on each side. Inside is the opaque well; outside is the
 * sheet WASHED BY THE AURORA, which is not the bare `-card-bg` token — the drift
 * costs up to a ratio point and a flat reading of it would be the optimistic
 * one. So the outside is modelled, per stop, and the tightest stop is what each
 * row is held to.
 *
 * THE AURORA MODEL IS SPELLED AGAIN HERE rather than imported, for the reason
 * `createCharacterContrast.test.ts` gives for spelling it twice: a test file
 * exports nothing, and this one has to stand alone as the archetype's paired
 * proof. Every number is resolved out of the stylesheet, so re-tuning the wash
 * re-runs the sum instead of leaving this asserting a stock nobody paints.
 *
 * ## What it reads out of source
 *
 * The token is not transcribed. The archetype is read, and the rows assert it
 * still DRAWS the edge they measure — so a repaint in some later PR turns this
 * red rather than leaving it green against a line nothing renders. That is the
 * failure mode a hand-copied contrast list has, and it is the same guard
 * `wowEditCharacterContrast.test.ts` puts on the slots it measures.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_LARGE,
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

const ARCHETYPE = readFileSync(
  fileURLToPath(new URL('../archetypes/DefaultEditCharacter.tsx', import.meta.url)),
  'utf8',
)

/** The sheet's stock, the well laid on it, and the line between them. */
const SHEET = '--faction-default-card-bg'
const WELL = '--faction-default-composer-field'
const EDGE = '--faction-default-card-muted'
/** What the edge used to be, and what this file exists to keep it from being. */
const HAIRLINE = '--faction-default-border'

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

function number(token: string, theme: Theme): number {
  const value = Number(resolveVar(token, theme, THEMES))
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
function washedSheet(theme: Theme): Rgba[] {
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

/** An edge token laid ON a ground, measured against that same ground. */
const edgeOn = (token: string, ground: Rgba, theme: Theme): number =>
  contrastRatio(compositeOver(resolve(token, theme), ground), ground)

const worstOutside = (token: string, theme: Theme): number =>
  Math.min(...washedSheet(theme).map((ground) => edgeOn(token, ground, theme)))

describe('the well has no fill of its own to be seen by', () => {
  // The premise. If the stock and the well ever stop matching, the edge stops
  // being the whole boundary and this file's floor is the wrong question — so
  // the premise is a row rather than a paragraph.
  it.each(BOTH_THEMES)('the well is indistinguishable from the sheet — %s', (theme) => {
    const sheet = resolve(SHEET, theme)
    const ratio = contrastRatio(compositeOver(resolve(WELL, theme), sheet), sheet)
    expect(ratio, `${WELL} on ${SHEET} is ${formatRatio(ratio)}`).toBeLessThan(AA_LARGE)
  })
})

describe('every control on the na edit sheet has a 1.4.11 edge', () => {
  it('the archetype draws this edge, and draws it once for all four consumers', () => {
    expect(ARCHETYPE, 'the edge is still the token measured below').toContain(
      `const MUTED = 'var(${EDGE})'`,
    )
    expect(ARCHETYPE, 'and it is still named once').toContain('const EDGE = MUTED')
    // Four mounts: the shared `fieldBox` behind the five fields, the portrait
    // picker's button, the faction row's plate and the confirm's cancel key.
    expect(ARCHETYPE.split('border: `1px solid ${EDGE}`').length - 1).toBe(4)
    expect(
      ARCHETYPE,
      'the hairline token is not an edge on this stock — see the archetype',
    ).not.toContain(`const BORDER = 'var(${HAIRLINE})'`)
  })

  for (const theme of BOTH_THEMES) {
    it(`clears 3:1 against the well it encloses — ${theme}`, () => {
      const well = compositeOver(resolve(WELL, theme), resolve(SHEET, theme))
      const ratio = edgeOn(EDGE, well, theme)
      expect(ratio, `${EDGE} on ${WELL} is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_LARGE)
    })

    it(`clears 3:1 against the aurora-washed sheet outside it — ${theme}`, () => {
      const ratio = worstOutside(EDGE, theme)
      expect(
        ratio,
        `${EDGE} on the worst aurora stop is ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(AA_LARGE)
    })
  }
})

describe('the hairline it replaced is why this file exists', () => {
  // The refusal, and it is the row that would let the edge quietly go back.
  // `--faction-default-border` is what every one of these controls drew until
  // #2991, and it misses on BOTH sides in BOTH cascades — so if it is ever
  // walked far enough to clear, this goes red and the archetype can have its
  // hairline back.
  for (const theme of BOTH_THEMES) {
    it(`\`${HAIRLINE}\` would not clear on either side — ${theme}`, () => {
      const well = compositeOver(resolve(WELL, theme), resolve(SHEET, theme))
      const inside = edgeOn(HAIRLINE, well, theme)
      const outside = worstOutside(HAIRLINE, theme)
      expect(inside, `${HAIRLINE} on the well is ${formatRatio(inside)}`).toBeLessThan(AA_LARGE)
      expect(
        outside,
        `${HAIRLINE} on the washed sheet is ${formatRatio(outside)}`,
      ).toBeLessThan(AA_LARGE)
    })
  }
})
