/**
 * The five washed composers, measured on the ground their type actually lands
 * on (#2485).
 *
 * ## The seam
 *
 * Not the rendered DOM and not the declared token: the COMPOSITE. Every skin
 * mounts a `ComposerGround` at `zIndex: 0` inside the sheet and draws the
 * content column at `zIndex: 1`, so a label on the sheet has one or two ornament
 * layers between it and the paint its ratio was computed against. Four
 * independent agents each found this on their own faction in #2346's fan-out and
 * none of them owned the composer; a fifth reading turned up on `na` while
 * #2505 was measuring how far Albescent could dial its bloom back.
 *
 * Every value here is RESOLVED OUT OF `index.css` and blended in node — no
 * colour constant, no transcribed alpha. That matters twice over: a repaint of
 * a ground re-runs the measurement instead of leaving these numbers asserting a
 * stock that is no longer there, and the first Everymen attempt at this shape
 * produced false failures at 3.78 / 4.37 / 2.69 by MODELLING the burst as three
 * layers stacked, which is a ground that does not exist.
 *
 * ## Why it is not appended to `factionContrast.test.ts`
 *
 * That file measures FLAT pairings, its `ARCHETYPE_PAIRS` registry is asserted
 * BOTH ways, and its own #1179 note records two red `main`s from restating
 * ratios into it. Every row below is a second GROUND for an ink that file
 * already carries, which is the split `createCharacterContrast.test.ts` and its
 * four faction siblings already made for the character-creation kit.
 *
 * ## Both directions, per faction
 *
 * The ink that is now used has to clear AA on the composite, AND the ink that
 * was refused has to still miss it. Walk a refused ink far enough to clear and
 * its row goes red — at which point the skin can go back to the rung the rest of
 * the kit uses, which is the outcome worth catching.
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
 * `saturate()` as `filter` applies it, sRGB, from the SVG colour matrix.
 *
 * Only `na` needs it: its aurora is desaturated hard in light and less hard in
 * dark, and modelling the stops at full chroma would report a ground the sheet
 * never shows. Read out of `--faction-default-aurora-filter` rather than typed
 * in, so re-tuning the wash re-runs the sum.
 */
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

/**
 * A skin's ground: the sheet, and every ground a line of type can land on.
 *
 * Each entry returns the WORST CASE HONESTLY — a fully-inked ornament at the
 * layer's own opacity, one peak at a time where the peaks are at opposite
 * corners. No point on any of these sheets carries two opposite corners at once.
 */
const GROUNDS: Record<string, (theme: Theme) => Rgba[]> = {
  // A lotus off one corner and an ensō off the other, both drawn in one token at
  // one opacity, so there is a single washed stock.
  ua: (theme) => [
    wash(
      '--faction-ua-card-lotus',
      number('--faction-ua-card-lotus-opacity', theme),
      resolve('--faction-ua-card-bg', theme),
      theme,
    ),
  ],
  // `.em-burst`: the ray fan covers the whole sheet, and the two glows peak at
  // OPPOSITE corners (`at 100% 0` and `at 0 100%`), so it is ray + one glow.
  everymen: (theme) =>
    ['--faction-everymen-bill-glow-gold', '--faction-everymen-bill-glow-olive'].map((glow) =>
      compositeOver(
        resolve('--faction-everymen-bill-ray', theme),
        compositeOver(resolve(glow, theme), resolve('--everymen-paper', theme)),
      ),
    ),
  // Two blooms at the design's two anchors, washed at the strength the faction
  // minted for its ward backdrop.
  coven: (theme) =>
    ['--faction-coven-slip-pk', '--faction-coven-slip-lav'].map((bloom) =>
      wash(
        bloom,
        number('--faction-coven-ward-haze', theme),
        resolve('--faction-coven-ward-card', theme),
        theme,
      ),
    ),
  // The standing raster is over every pixel; the travelling band passes under
  // every region in turn, so the peak of its ramp is the honest floor.
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
    // Picked by comparing alphas, not by index, so re-ordering the ramp cannot
    // silently choose the transparent end.
    const peak = stops.reduce((strongest, stop) => (stop.a > strongest.a ? stop : strongest))
    return [compositeOver(peak, rastered)]
  },
  // Seven radial stops, each peaking at its own anchor, filtered and (in dark)
  // screen-blended before the layer's opacity lands them on the sheet.
  na: (theme) => {
    const sheet = resolve('--faction-default-card-bg', theme)
    const alpha = number('--faction-default-aurora-opacity', theme)
    const filter = resolveVar('--faction-default-aurora-filter', theme, THEMES)
    const blend = resolveVar('--faction-default-aurora-blend', theme, THEMES)
    const aurora = resolveVar('--faction-default-aurora', theme, THEMES)
    expect(aurora, `the aurora resolves in ${theme}`).not.toBeNull()
    const amount = /saturate\(([\d.]+)\)/.exec(filter ?? '')
    expect(amount, `the aurora filter names a saturate() in ${theme}`).not.toBeNull()
    return [...aurora!.matchAll(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi)]
      .map((match) => parseColor(match[0]))
      .filter((stop): stop is Rgba => stop !== null)
      .map((stop) => {
        const filtered = saturate(stop, Number(amount![1]))
        const painted = blend?.trim() === 'screen' ? screenOver(filtered, sheet) : filtered
        return compositeOver({ ...painted, a: alpha }, sheet)
      })
  },
}

interface Skin {
  /** The composer file, for the parity guard. */
  file: string
  /** What the skin draws on the washed sheet now, and what each string is. */
  inks: Array<{ what: string; token: string }>
  /**
   * The rung the skin used to set, which must still miss — the load-bearing
   * half of every swap in #2485.
   *
   * `themes` narrows it where only one cascade was ever the miss: Everymen's
   * `-quiet` IS `-muted` in dark, so there is nothing to choose between at
   * night, and asserting a refusal there would be asserting against an alias of
   * the ink that passed.
   */
  refused: { token: string; themes: Theme[] }
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
    refused: { token: '--faction-ua-card-muted', themes: BOTH_THEMES },
  },
  everymen: {
    file: 'EverymenEditPraxis.tsx',
    inks: [
      { what: 'the headings and the stencilled labels', token: '--everymen-paper-text' },
      { what: 'the slip prose, the exits and the quiet buttons', token: '--everymen-quiet' },
    ],
    refused: { token: '--everymen-muted', themes: ['light'] },
  },
  coven: {
    file: 'CovenEditPraxis.tsx',
    inks: [
      { what: 'titles and section heads', token: '--faction-coven-slip-ink' },
      {
        what: 'eyebrows, captions, the exits and the roster chip',
        token: '--faction-coven-slip-label',
      },
      // NOT `--faction-coven-slip-soft`. It is the slip's prose ink and it stays
      // on the opaque `--faction-coven-ward-page` — the brief, and the waiting
      // surface's body, which is drawn inside `panelStyle`. On the WASHED sheet
      // it reads 4.46:1 in dark against `-slip-label`'s 4.63, which is why the
      // roster's chips moved up a rung rather than the ink moving down a ground.
    ],
    // Coven is the one skin whose refusal is not an INK. The ladder was fine and
    // the wash was not, so what is asserted below is the strength itself.
    refused: { token: '--faction-coven-slip-label', themes: [] },
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
    refused: { token: '--faction-singularity-term-dim', themes: BOTH_THEMES },
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
    // NOT `-composer-faint`, which is the token #2485 lifted. `-card-muted` is
    // the na CARD's prose ink, it has a dozen readers of its own so it could not
    // move, and it is why the sheet's quiet tier is now the LOUDER of the two.
    refused: { token: '--faction-default-card-muted', themes: BOTH_THEMES },
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

  for (const theme of skin.refused.themes) {
    it(`and ${skin.refused.token} still would not — ${theme}`, () => {
      const ink = resolve(skin.refused.token, theme)
      const flat = contrastRatio(ink, GROUNDS[key](theme)[0])
      expect(
        worst(ink, GROUNDS[key](theme)),
        `the refused rung is ${formatRatio(flat)} on the composite`,
      ).toBeLessThan(AA_NORMAL)
    })
  }
})

describe('the wash is the tighter reading, not the flatterer', () => {
  // The guard that makes every row above mean something. If a composite were
  // ever LIGHTER (in light) or DARKER (in dark) than the bare sheet for the
  // skin's own quiet ink, measuring it would be the optimistic reading and this
  // whole file would be proving the wrong thing.
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
  // The refusal for Coven is the OPACITY, not an ink: the sheet was hard-coded
  // to `0.7` while `--faction-coven-ward-haze` had already been minted for the
  // ward backdrop, with the measurements that picked it written beside it. A
  // faction that has minted a wash strength has minted it for every surface that
  // wash lands on.
  it('the composer no longer states a bare opacity for its bloom layer', () => {
    const composer = source('CovenEditPraxis.tsx')
    expect(composer).toContain('opacity="var(--faction-coven-ward-haze)"')
    expect(composer).not.toContain('opacity={0.7}')
  })

  it.each(BOTH_THEMES)('and 0.7 would still put the label tier under AA — %s', (theme) => {
    const sheet = resolve('--faction-coven-ward-card', theme)
    const hard = ['--faction-coven-slip-pk', '--faction-coven-slip-lav'].map((bloom) =>
      wash(bloom, 0.7, sheet, theme),
    )
    const ratio = worst(resolve('--faction-coven-slip-label', theme), hard)
    expect(ratio, `at 0.7 the label tier is ${formatRatio(ratio)}`).toBeLessThan(AA_NORMAL)
  })
})

/**
 * THE SINGULARITY COMPOSER'S LABEL SEAM, ON BOTH GROUNDS IT LANDS ON (#2831).
 *
 * `.label-caption` and `.label-heading` paint `--label-ink`, and so does
 * CodeMirror's `.cm-placeholder` (`bodyEditorTheme.ts`, the #1819 seam). This
 * skin never re-pointed it, so every one of them fell through to the global
 * tertiary — a tier calibrated against ordinary page stock, on a terminal that
 * is near-black in BOTH cascades. Measured on the real composited grounds, in
 * light: **1.81:1** on the washed chassis, where the waiting notices, the live-
 * proposal line and the publish-needs-title line sit, and **2.07:1** on the
 * panel, where the placeholder sits. Dark was never the miss (6.79 / 8.99).
 *
 * The placeholder is the reading #2831 was filed on. The captions are WORSE,
 * which is what picked the fix: not a token minted for one element, but the
 * root re-point `EphemeristsEditPraxis` already makes for the identical defect
 * on the identical component (#1800) — the other near-black composer.
 *
 * TWO RUNGS, BECAUSE THE SKIN ALREADY SPLITS ITS QUIET TIER BY GROUND (#2485,
 * #2353), not because two names are nicer than one. `-term-dim` MISSES the
 * washed chassis at 4.12 / 4.20 — the refusal the SKINS table above already
 * asserts — so the root cannot be the quiet rung; and `-term-ink` on the panel
 * is the field's OWN typed ink, so a placeholder painted with it is
 * indistinguishable from body text the player has actually written. (The
 * preview tab's empty state already draws this same string in `-term-dim` on
 * this same panel.) So the chassis takes `-term-ink` and the box steps back
 * down to `-term-dim`, which is the split this archetype's `MUTED` docblock
 * spells out in full.
 */
describe('the Singularity composer re-points the label seam (#2831)', () => {
  const CHASSIS_RUNG = '--faction-singularity-term-ink'
  const PANEL_RUNG = '--faction-singularity-term-dim'
  /** The live write-up box: the raised panel, opaque, so the wash never reaches it. */
  const PANEL = '--faction-singularity-term-panel'
  const FELL_THROUGH_TO = '--color-text-tertiary'
  const LIVE_BOX = '[data-composer-body].sg-composer-off:not([aria-disabled="true"])'

  /** The `var(--token)` one declaration names, or `null`. */
  function seamIn(selector: string): string | null {
    const bodies = ruleBodies(stripComments(CSS), selector)
    expect(bodies.length, `\`${selector}\` is declared in index.css`).toBeGreaterThan(0)
    const match = /--label-ink\s*:\s*var\(\s*(--[\w-]+)\s*\)/.exec(bodies.join(';'))
    return match?.[1] ?? null
  }

  it('sets the seam on its own root, the way the other near-black composer does', () => {
    // `dress.pageStyle` is the root both `ComposerPage` and
    // `PraxisWaitingSurface` mount — the same element #1800 fixed on the
    // Ephemerists plate, reached the same way. There is no className on
    // `ComposerPage`, so the seam is an inline custom property there and not a
    // rule; it is a `var()` reference either way, never a colour.
    expect(
      source('SingularityEditPraxis.tsx'),
      'without this every .label-caption in the composer reads the global tertiary at 1.81:1 on the washed chassis',
    ).toContain('["--label-ink" as string]: INK')
  })

  it('and steps it back down to the quiet rung inside the live write-up box', () => {
    // Scoped OFF the live half explicitly: `[data-composer-body][aria-disabled]`
    // is #2574's rule and owns the unavailable state, and `:not()` here is what
    // keeps this declaration from having an opinion about it.
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
      // Opaque, which is why the panel IS the composite here: the standing
      // raster and the travelling band are drawn by `ComposerGround` at
      // `zIndex: 0`, under a field the content column paints at `zIndex: 1`.
      expect(panel.a, 'the write-up box grounds itself opaquely').toBe(1)
      const ratio = contrastRatio(resolve(PANEL_RUNG, theme), panel)
      expect(ratio, `the live placeholder is ${formatRatio(ratio)} on the panel`)
        .toBeGreaterThanOrEqual(AA_NORMAL)
    })
  }

  /**
   * THE BLAST RADIUS, MEASURED RATHER THAN ARGUED. A seam set on the root
   * cascades to every bare `.label-caption` and `.label-heading` under it, on
   * whichever of the terminal's grounds each one happens to stand on — and the
   * two stages this root spans (the composer and `PraxisWaitingSurface`) draw
   * on all four. Naming them one at a time is what makes "whatever else
   * inherits it has been measured" a fact rather than a hope.
   *
   * The bare page under the sheet is deliberately not in this list. It is the
   * app's own `--color-bg-page`, where a phosphor would be unreadable — and the
   * only thing standing on it is the breadcrumb, neutral site chrome that
   * paints `--color-text-tertiary` directly and carries no label class, so the
   * seam does not reach it (#2102). A `.label-caption` mounted straight on the
   * composer page would be the exception, and there is none.
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

  // LIGHT ONLY, and that is the finding rather than a gap in the sweep. The
  // global tertiary flips with the cascade and the terminal does not, so at
  // night the neutral is a pale ink on a black box and reads 6.79 / 8.99. A
  // refusal asserted there would be asserting against a value that never failed.
  it('and the global tertiary it fell through to misses BOTH grounds — light', () => {
    const neutral = resolve(FELL_THROUGH_TO, 'light')
    const chassis = worst(neutral, GROUNDS.singularity('light'))
    expect(chassis, `the captions were ${formatRatio(chassis)}`).toBeLessThan(AA_NORMAL)
    const panel = contrastRatio(neutral, resolve(PANEL, 'light'))
    expect(panel, `the placeholder was ${formatRatio(panel)}`).toBeLessThan(AA_NORMAL)
  })
})

describe('keeps each ground in step with the skin that draws it', () => {
  // Transcribed grounds rot, and a model of a ground nobody paints any more is
  // a green pass over nothing. These are the cheapest possible anchors: the
  // skin still names the tokens this file composites, and no longer names the
  // rung it refused.
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
      // Plus the chassis half of the tier split: the roster's chip and leave
      // link are drawn on transparent, so they take the chassis rung.
      names: ['${SCAN} 0 1px', 'className="sg-scan"', 'quiet: INK'],
      absent: [],
    },
    na: {
      // Plus the section-label rung, which is the one line that says out loud
      // that the sheet's quiet ink is the composer's own token and not the
      // card's.
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
