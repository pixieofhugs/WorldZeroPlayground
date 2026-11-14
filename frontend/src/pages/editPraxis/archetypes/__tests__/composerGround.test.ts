/**
 * The five washed composers, measured on the composite their type lands on
 * (#2485): `ComposerGround` at `zIndex: 0` puts ornament layers under every label.
 * All values are resolved from `index.css` and blended in node, so a repaint
 * re-runs the measurement. Model the real ground: stacking all Everymen layers
 * at once gave false failures.
 *
 * Not in `factionContrast.test.ts`: that file measures flat pairs; these are
 * second grounds for inks it already carries.
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
} from '../../../../utils/contrast'
import {
  naWashedSheet,
  readThemes,
  resolveVar,
  ruleBodies,
  stripComments,
  type Theme,
} from '../../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../../test/indexCss'

const CSS = readIndexCss()
const THEMES = readThemes(CSS)
const BOTH_THEMES: Theme[] = ['light', 'dark']

const source = (file: string): string =>
  readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8')

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

/** A token laid over a ground at an alpha the stylesheet names. */
function wash(token: string, alpha: number, ground: Rgba, theme: Theme): Rgba {
  return compositeOver({ ...resolve(token, theme), a: alpha }, ground)
}



/**
 * Every ground a line of type can land on: a fully-inked ornament at the
 * layer's opacity, one peak at a time where peaks sit at opposite corners.
 */
const GROUNDS: Record<string, (theme: Theme) => Rgba[]> = {
  // Lotus and ensō share one token and opacity: one washed stock.
  ua: (theme) => [
    wash(
      '--faction-ua-card-lotus',
      number('--faction-ua-card-lotus-opacity', theme),
      resolve('--faction-ua-card-bg', theme),
      theme,
    ),
  ],
  // `.em-burst`: rays everywhere, glows at opposite corners, so ray + one glow.
  everymen: (theme) =>
    ['--faction-everymen-bill-glow-gold', '--faction-everymen-bill-glow-olive'].map((glow) =>
      compositeOver(
        resolve('--faction-everymen-bill-ray', theme),
        compositeOver(resolve(glow, theme), resolve('--everymen-paper', theme)),
      ),
    ),
  // Two blooms at the ward-backdrop haze strength.
  coven: (theme) =>
    ['--faction-coven-slip-pk', '--faction-coven-slip-lav'].map((bloom) =>
      wash(
        bloom,
        number('--faction-coven-ward-haze', theme),
        resolve('--faction-coven-ward-card', theme),
        theme,
      ),
    ),
  // Raster everywhere; the travelling band's ramp peak is the floor.
  singularity: (theme) => {
    const rastered = compositeOver(
      resolve('--faction-singularity-term-scan', theme),
      resolve('--faction-singularity-term-bg', theme),
    )
    const ramp = resolveVar('--faction-singularity-term-sweep', theme, THEMES)
    expect(ramp, `the sweep resolves in ${theme}`).not.toBeNull()
    const stops = [...ramp!.matchAll(/rgba?\([^)]*\)/g)]
      .map((match) => parseColor(match[0]))
      .filter((stop): stop is Rgba => stop !== null)
    expect(stops.length, `the sweep is a ramp in ${theme}`).toBeGreaterThan(1)
    // By alpha, not index, so reordering can't pick the transparent end.
    const peak = stops.reduce((strongest, stop) => (stop.a > strongest.a ? stop : strongest))
    return [compositeOver(peak, rastered)]
  },
  // Seven-stop aurora; shared model in `naWashedSheet` (#2993).
  na: (theme) => naWashedSheet(theme, THEMES),
}

interface Skin {
  /** The composer file, for the parity guard. */
  file: string
  /** What the skin draws on the washed sheet now, and what each string is. */
  inks: Array<{ what: string; token: string }>
}

const SKINS: Record<string, Skin> = {
  ua: {
    file: 'UaEditPraxis.tsx',
    inks: [
      { what: 'the heading and the picked mode', token: '--faction-ua-card-text' },
      {
        what: 'labels, counters, the roster quiet tier, Save draft and Drop',
        token: '--faction-ua-card-body',
      },
    ],
  },
  everymen: {
    file: 'EverymenEditPraxis.tsx',
    inks: [
      { what: 'the headings and the stencilled labels', token: '--everymen-paper-text' },
      { what: 'the slip prose, the exits and the quiet buttons', token: '--everymen-quiet' },
    ],
  },
  coven: {
    file: 'CovenEditPraxis.tsx',
    inks: [
      { what: 'titles and section heads', token: '--faction-coven-slip-ink' },
      {
        what: 'eyebrows, captions, the exits and the roster chip',
        token: '--faction-coven-slip-label',
      },
      // Not `-slip-soft`: it stays on the opaque ward page; 4.46:1 dark on the wash.
    ],
    // Coven's refusal is the wash strength, not an ink (asserted below).
  },
  singularity: {
    file: 'SingularityEditPraxis.tsx',
    inks: [
      { what: 'the titles and the lit lamp', token: '--faction-singularity-term-bright' },
      {
        what: 'section labels, the roster chip, the exits and the autosave line',
        token: '--faction-singularity-term-ink',
      },
    ],
  },
  na: {
    file: 'DefaultEditPraxis.tsx',
    inks: [
      { what: 'the heading and the picked mode', token: '--faction-default-card-text' },
      {
        what: 'labels, the autosave line, the inactive tab, Save draft and Drop',
        token: '--faction-default-composer-faint',
      },
    ],
    // `-card-muted` is the na card's prose ink, too widely read to move.
  },
}

const worst = (ink: Rgba, grounds: Rgba[]): number =>
  Math.min(...grounds.map((ground) => contrastRatio(ink, ground)))

describe.each(Object.entries(SKINS))('the %s composer on its own washed ground', (key, skin) => {
  for (const theme of BOTH_THEMES) {
    for (const { what, token } of skin.inks) {
      it(`${what} clears AA — ${theme}`, () => {
        const ratio = worst(resolve(token, theme), GROUNDS[key](theme))
        expect(ratio, `${token} on the composite is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
          AA_NORMAL,
        )
      })
    }
  }

})

describe('the wash is the tighter reading, not the flatterer', () => {
  // If the composite were the optimistic reading, this file would prove nothing.
  const SHEETS: Record<string, string> = {
    ua: '--faction-ua-card-bg',
    everymen: '--everymen-paper',
    coven: '--faction-coven-ward-card',
    singularity: '--faction-singularity-term-bg',
    na: '--faction-default-card-bg',
  }

  it.each(
    Object.entries(SKINS).flatMap(([key, skin]) =>
      BOTH_THEMES.map((theme) => [key, theme, skin.inks[skin.inks.length - 1].token] as const),
    ),
  )('%s — %s', (key, theme, token) => {
    const ink = resolve(token, theme)
    const flat = contrastRatio(ink, resolve(SHEETS[key], theme))
    const washed = worst(ink, GROUNDS[key](theme))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})

describe('Coven washes at the strength its own faction minted', () => {
  // A minted wash strength applies to every surface the wash lands on.
  it('the composer no longer states a bare opacity for its bloom layer', () => {
    const composer = source('CovenEditPraxis.tsx')
    expect(composer).toContain('opacity="var(--faction-coven-ward-haze)"')
    expect(composer).not.toContain('opacity={0.7}')
  })
})

/**
 * Singularity's label seam on both its grounds (#2831). `.label-*` and
 * `.cm-placeholder` paint `--label-ink`; unset, it fell to the global tertiary
 * (light: 1.81:1 washed chassis, 2.07:1 panel). Fixed by the root re-point
 * Ephemerists uses (#1800). Two rungs because the skin splits its quiet tier by
 * ground: `-term-dim` misses the washed chassis, and `-term-ink` on the panel
 * would look like typed text. See the archetype's `MUTED` docblock.
 */
describe('the Singularity composer re-points the label seam (#2831)', () => {
  const CHASSIS_RUNG = '--faction-singularity-term-ink'
  const PANEL_RUNG = '--faction-singularity-term-dim'
  /** The live write-up box: the raised panel, opaque, so the wash never reaches it. */
  const PANEL = '--faction-singularity-term-panel'
  const LIVE_BOX = '[data-composer-body].sg-composer-off:not([aria-disabled="true"])'

  /** The `var(--token)` one declaration names, or `null`. */
  function seamIn(selector: string): string | null {
    const bodies = ruleBodies(stripComments(CSS), selector)
    expect(bodies.length, `\`${selector}\` is declared in index.css`).toBeGreaterThan(0)
    const match = /--label-ink\s*:\s*var\(\s*(--[\w-]+)\s*\)/.exec(bodies.join(';'))
    return match?.[1] ?? null
  }

  it('sets the seam on its own root, the way the other near-black composer does', () => {
    // Inline on `dress.pageStyle` (no className on `ComposerPage`), a `var()`.
    expect(
      source('SingularityEditPraxis.tsx'),
      'without this every .label-caption in the composer reads the global tertiary at 1.81:1 on the washed chassis',
    ).toContain('["--label-ink" as string]: INK')
  })

  it('and steps it back down to the quiet rung inside the live write-up box', () => {
    // `:not()` leaves the unavailable state to #2574's rule.
    expect(seamIn(LIVE_BOX), 'the live placeholder rung').toBe(PANEL_RUNG)
  })

  for (const theme of BOTH_THEMES) {
    it(`the sheet's captions clear AA on the washed chassis — ${theme}`, () => {
      const ratio = worst(resolve(CHASSIS_RUNG, theme), GROUNDS.singularity(theme))
      expect(ratio, `${CHASSIS_RUNG} on the composite is ${formatRatio(ratio)}`)
        .toBeGreaterThanOrEqual(AA_NORMAL)
    })

    it(`the placeholder clears AA on the panel it actually sits on — ${theme}`, () => {
      const panel = resolve(PANEL, theme)
      // Opaque, so the panel IS the composite (the ground is at `zIndex: 0`).
      expect(panel.a, 'the write-up box grounds itself opaquely').toBe(1)
      const ratio = contrastRatio(resolve(PANEL_RUNG, theme), panel)
      expect(ratio, `the live placeholder is ${formatRatio(ratio)} on the panel`)
        .toBeGreaterThanOrEqual(AA_NORMAL)
    })
  }

  /**
   * The root seam cascades to every `.label-*` on all four terminal grounds.
   * The bare page is excluded: only the breadcrumb stands on it, with no label
   * class (#2102).
   */
  const EVERY_GROUND = [
    ['the sheet, flat', '--faction-singularity-term-bg'],
    ['the raised panel — fields, slip, toolbar', PANEL],
    ['the window bar', '--faction-singularity-term-chrome'],
    ['the desk under the chassis', '--faction-singularity-term-page'],
  ] as const

  for (const theme of BOTH_THEMES) {
    for (const [what, ground] of EVERY_GROUND) {
      it(`and clears AA on ${what} too — ${theme}`, () => {
        const ratio = contrastRatio(resolve(CHASSIS_RUNG, theme), resolve(ground, theme))
        expect(ratio, `${CHASSIS_RUNG} on ${ground} is ${formatRatio(ratio)}`)
          .toBeGreaterThanOrEqual(AA_NORMAL)
      })
    }
  }
})

describe('keeps each ground in step with the skin that draws it', () => {
  // Transcribed grounds rot: the skin must still name what's composited here.
  const ANCHORS: Record<string, { names: string[]; absent: string[] }> = {
    ua: {
      names: ['var(--faction-ua-card-lotus)', 'var(--faction-ua-card-lotus-opacity)'],
      absent: ['--faction-ua-card-muted'],
    },
    everymen: { names: ['className="em-burst"'], absent: ['var(--everymen-muted)'] },
    coven: {
      names: ['var(--faction-coven-slip-lav)', 'var(--faction-coven-ward-haze)'],
      absent: [],
    },
    singularity: {
      // Plus the chassis rung for the roster chip and leave link.
      names: ['${SCAN} 0 1px', 'className="sg-scan"', 'quiet: INK'],
      absent: [],
    },
    na: {
      // Plus the section label on the composer's own quiet token.
      names: [
        'var(--faction-default-aurora)',
        'var(--faction-default-aurora-opacity)',
        'const labelStyle = { color: FAINT };',
      ],
      absent: [],
    },
  }

  it.each(Object.entries(ANCHORS))('%s', (key, anchor) => {
    const composer = source(SKINS[key].file)
    for (const name of anchor.names) expect(composer).toContain(name)
    for (const name of anchor.absent) expect(composer).not.toContain(name)
  })
})
