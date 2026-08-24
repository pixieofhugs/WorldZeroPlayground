/**
 * The Singularity create-character archetype's inks, measured on the ground
 * that is actually behind them (#2353).
 *
 * THE SEAM IS THE COMPOSITE, NOT THE DECLARED TOKEN. `factionContrast.test.ts`
 * already measures every `--faction-singularity-term-*` pairing against the FLAT
 * chassis, the flat panel, the flat window bar and the flat readout well, and
 * every one of those rows is green. None of them is what this page's type sits
 * on. `ComposerSheet` paints the ground layer at `zIndex: 0` and the content
 * column at `zIndex: 1`, so anything drawn straight on the chassis has TWO more
 * layers between it and the paint it was measured against:
 *
 *   1. the standing raster — `--faction-singularity-term-scan` on one pixel in
 *      every three, so a line of type can land on a lit row;
 *   2. the travelling scan band — `--faction-singularity-term-sweep`, whose
 *      middle stop is the strongest wash on the sheet and which passes under
 *      every region of the page in turn.
 *
 * Measured on that stack, ONE INK THAT PASSES FLAT FAILS: `-term-dim`, the
 * family's caption tier, reads 5.03 / 5.80 on the bare chassis and 4.12 / 4.20
 * under the band. That is the archetype's whole colour rule and the reason it is
 * written as a measurement rather than as prose in a docblock: on this surface
 * `-term-dim` is a PANEL ink only. Type drawn on the chassis takes `-term-ink`
 * or `-term-bright`, both of which clear the band with room.
 *
 * NOTHING IS TRANSCRIBED. The raster's alpha and the band's peak stop are read
 * out of `index.css` and composited here, so a repaint of either token re-runs
 * the measurement instead of leaving these numbers asserting a ground that no
 * longer exists — which is the failure mode `createCharacterContrast.test.ts`
 * had to write a stylesheet-parity guard for.
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

const CSS_PATH = fileURLToPath(new URL('../../../index.css', import.meta.url))
const THEMES = readThemes(readFileSync(CSS_PATH, 'utf8'))
const BOTH_THEMES: Theme[] = ['light', 'dark']

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/**
 * The band's strongest stop.
 *
 * `--faction-singularity-term-sweep` is a three-stop `linear-gradient` that
 * fades in and out, so the honest worst case is its middle — the peak alpha,
 * whichever stop carries it. Picked by comparing the stops rather than by index,
 * so re-ordering the ramp cannot silently pick the transparent end.
 */
function sweepPeak(theme: Theme): Rgba {
  const raw = resolveVar('--faction-singularity-term-sweep', theme, THEMES)
  expect(raw, `the sweep resolves in ${theme}`).not.toBeNull()
  const stops = [...raw!.matchAll(/rgba?\([^)]*\)/g)]
    .map((match) => parseColor(match[0]))
    .filter((stop): stop is Rgba => stop !== null)
  expect(stops.length, `the sweep is a ramp in ${theme}`).toBeGreaterThan(1)
  return stops.reduce((strongest, stop) => (stop.a > strongest.a ? stop : strongest))
}

/** Chassis → standing raster → travelling band. The worst ground on the sheet. */
function sweptChassis(theme: Theme): Rgba {
  const chassis = resolve('--faction-singularity-term-bg', theme)
  const rastered = compositeOver(resolve('--faction-singularity-term-scan', theme), chassis)
  return compositeOver(sweepPeak(theme), rastered)
}

/** Every ink this archetype puts straight on the chassis, and what draws it. */
const CHASSIS_INKS: Array<{ what: string; token: string }> = [
  { what: 'the heading and the selected calling', token: '--faction-singularity-term-bright' },
  {
    what: 'section labels, the calling hint, the exits and the portrait status',
    token: '--faction-singularity-term-ink',
  },
  // The functional red inside a faction frame takes that faction's card alarm
  // (#1302) — `--color-danger` is the neutral this page must not draw.
  { what: 'the error banner and the avatar error', token: '--faction-singularity-card-alarm' },
]

/** And every ink it puts on the raised panel, which the ground never reaches. */
const PANEL_INKS: Array<{ what: string; token: string }> = [
  { what: 'field text', token: '--faction-singularity-term-ink' },
  { what: 'the @handle and the character counters', token: '--faction-singularity-term-dim' },
  { what: 'the portrait key and an unpicked calling', token: '--faction-singularity-term-bright' },
  { what: 'a counter at its cap', token: '--faction-singularity-card-alarm' },
]

describe('the terminal chassis clears AA under its own two ornament layers', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of CHASSIS_INKS) {
      it(`${what} — ${theme}`, () => {
        const ratio = contrastRatio(resolve(token, theme), sweptChassis(theme))
        expect(
          ratio,
          `${token} on the chassis under the raster and the scan band is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }
})

describe('the raised panel is opaque, so its inks keep their flat measurement', () => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of PANEL_INKS) {
      it(`${what} — ${theme}`, () => {
        const panel = resolve('--faction-singularity-term-panel', theme)
        const ratio = contrastRatio(resolve(token, theme), panel)
        expect(
          ratio,
          `${token} on --faction-singularity-term-panel is ${formatRatio(ratio)}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }
})

describe('the caption tier is a panel ink on this surface, and that is measured', () => {
  // The load-bearing half of the archetype's colour rule. `-term-dim` is the
  // family's caption ink and it is what every other Singularity surface labels
  // with — including the composer, whose section labels sit on this same
  // chassis under this same band. Here it is refused, and this row is the
  // reason: it passes flat and fails composited, which is exactly the mistake
  // #2353's acceptance criterion was written against.
  //
  // If the band or the raster is ever quietened far enough for this to clear,
  // this row goes red and the label tier can be reconsidered — which is the
  // outcome worth catching, and why the assertion is `toBeLessThan` rather than
  // a comment.
  it.each(BOTH_THEMES)('%s — dim survives the raster and fails the band', (theme) => {
    const dim = resolve('--faction-singularity-term-dim', theme)
    const chassis = resolve('--faction-singularity-term-bg', theme)
    const rastered = compositeOver(resolve('--faction-singularity-term-scan', theme), chassis)

    expect(
      contrastRatio(dim, chassis),
      'flat, which is what factionContrast.test.ts measures',
    ).toBeGreaterThanOrEqual(AA_NORMAL)
    expect(contrastRatio(dim, rastered), 'the raster alone').toBeGreaterThanOrEqual(AA_NORMAL)
    expect(
      contrastRatio(dim, sweptChassis(theme)),
      `under the band it is ${formatRatio(contrastRatio(dim, sweptChassis(theme)))}`,
    ).toBeLessThan(AA_NORMAL)
  })
})

describe('the error banner keeps its ink under the neutral danger veil', () => {
  // `ErrorBanner` washes `--color-danger-veil` over whatever it is mounted on
  // and the veil stays neutral (ADR-0061), so the banner's real ground is a
  // THIRD layer on the stack above.
  it.each(BOTH_THEMES)('%s', (theme) => {
    const ground = compositeOver(resolve('--color-danger-veil', theme), sweptChassis(theme))
    const ratio = contrastRatio(resolve('--faction-singularity-card-alarm', theme), ground)
    expect(ratio, `the alarm under the veil is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

describe('the submit band and the window bar', () => {
  // Both are opaque paint of their own, drawn ABOVE the ground rather than on
  // it — the masthead at zIndex 2, the band a filled button. They are here so
  // the archetype's whole ink set is measured in one place rather than half
  // here and half by inference.
  it.each(BOTH_THEMES)('%s — the cast key and the process name', (theme) => {
    const cast = contrastRatio(
      resolve('--faction-singularity-term-cta-ink', theme),
      resolve('--faction-singularity-term-cta-bg', theme),
    )
    expect(cast, `the cast key is ${formatRatio(cast)}`).toBeGreaterThanOrEqual(AA_NORMAL)

    const proc = contrastRatio(
      resolve('--faction-singularity-term-dim', theme),
      resolve('--faction-singularity-term-chrome', theme),
    )
    expect(proc, `the process name is ${formatRatio(proc)}`).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})
