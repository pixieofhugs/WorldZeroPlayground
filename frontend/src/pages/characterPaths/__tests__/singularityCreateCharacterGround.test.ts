/**
 * The Singularity create archetype's inks, measured on the composited chassis
 * (#2353): flat `-term-bg` + the standing raster (`-term-scan`) + the scan
 * band's peak (`-term-sweep`). Flat pairs are `factionContrast.test.ts`'s.
 *
 * `-term-dim` passes flat but fails under the band, so here it is a PANEL ink
 * only; chassis type takes `-term-ink` / `-term-bright`. Both layers are read
 * from `index.css`, not transcribed.
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

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

/** The band's peak-alpha stop, chosen by alpha rather than index. */
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
  // A faction frame takes its card alarm, not `--color-danger` (#1302).
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
  // Goes red if the band quietens enough for dim to clear; then reconsider.
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
  // `ErrorBanner`'s neutral veil (ADR-0061) is a third layer.
  it.each(BOTH_THEMES)('%s', (theme) => {
    const ground = compositeOver(resolve('--color-danger-veil', theme), sweptChassis(theme))
    const ratio = contrastRatio(resolve('--faction-singularity-card-alarm', theme), ground)
    expect(ratio, `the alarm under the veil is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})

describe('the submit band and the window bar', () => {
  // Opaque, above the ground; here so the whole ink set is in one place.
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
