/**
 * What the unavailable write-up box paints, and what it may not go back to (#2574).
 *
 * Measures the composite pair while `aria-disabled` is on: the ground the
 * `[data-composer-body][aria-disabled="true"]` rule declares, and the ink
 * `--label-ink` resolves to inside it (what `.cm-placeholder` reads in
 * `bodyEditorTheme.ts`, the only text before the seed lands). Markup half lives
 * in `bodyUnavailableDress.test.tsx`.
 *
 * `opacity` fades ground and ink together, so the ink loses contrast twice
 * (#2486): the 0.6 a `ponytail:` once shipped put every skin under AA. No alpha
 * works: field and sheet are the same stock, so fading spends the ink.
 *
 * Asserted on the bare sheet, not the washed composite from
 * `composerGround.test.ts`: the wash is tighter, so a refusal here holds there.
 * The house pair's ratio is gated in `disabledControlContrast.test.ts`; not
 * restated here.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  deltaE76,
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

/**
 * Every declaration of one rule, by exact selector, plain properties included
 * (`cssVars.declarationsIn` reads only `--custom` names).
 */
function declarations(selector: string): Map<string, string> {
  const bodies = ruleBodies(stripComments(CSS), selector)
  expect(bodies.length, `\`${selector}\` is declared in index.css`).toBeGreaterThan(0)
  const map = new Map<string, string>()
  for (const body of bodies) {
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      map.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim())
    }
  }
  return map
}

/** The `var(--token)` a declaration is, `!important` and all, or `null`. */
function tokenIn(declaration: string | undefined): string | null {
  return /^var\(\s*(--[\w-]+)\s*\)(?:\s*!important)?$/.exec(declaration?.trim() ?? '')?.[1] ?? null
}

const UNAVAILABLE = '[data-composer-body][aria-disabled="true"]'

/**
 * Every composer's write-up box: live ground, sheet behind it, placeholder ink.
 * Eight rows: `na` and `albescent` both resolve to `default` (ADR-0039).
 * `placeholder` is `--label-ink` inside that skin; Ephemerists and Singularity
 * re-point it on their own root (#1819). `source` anchors the parity block below.
 */
const SKINS = [
  { key: 'na', field: '--faction-default-composer-field', sheet: '--faction-default-card-bg', placeholder: '--color-text-tertiary', source: 'DefaultEditPraxis.tsx' },
  { key: 'ua', field: '--faction-ua-panel', sheet: '--faction-ua-card-bg', placeholder: '--color-text-tertiary', source: 'UaEditPraxis.tsx' },
  { key: 'wow', field: '--faction-wow-chronicle-panel', sheet: '--faction-wow-card-bg', placeholder: '--color-text-tertiary', source: 'WowEditPraxis.tsx' },
  { key: 'coven', field: '--faction-coven-ward-page', sheet: '--faction-coven-ward-card', placeholder: '--color-text-tertiary', source: 'CovenEditPraxis.tsx' },
  { key: 'snide', field: '--faction-snide-composer-field', sheet: '--faction-snide-wall', placeholder: '--color-text-tertiary', source: 'SnideEditPraxis.tsx' },
  { key: 'ephemerists', field: '--faction-ephemerists-plate-inner', sheet: '--faction-ephemerists-plate-bg', placeholder: '--faction-ephemerists-plate-quiet', source: 'EphemeristsEditPraxis.tsx' },
  { key: 'singularity', field: '--faction-singularity-term-panel', sheet: '--faction-singularity-term-bg', placeholder: '--faction-singularity-term-dim', source: 'SingularityEditPraxis.tsx' },
  { key: 'everymen', field: '--faction-everymen-sheet-panel', sheet: '--everymen-paper', placeholder: '--color-text-tertiary', source: 'EverymenEditPraxis.tsx' },
] as const

/** The alpha this file exists to keep out. */
const REFUSED_ALPHA = 0.6

describe('the unavailable write-up box reads #2573’s pair, not an opacity', () => {
  it('grounds and inks itself from --control-off-*, and re-points the label seam', () => {
    const declared = declarations(UNAVAILABLE)
    // On a selector that can reach a `contenteditable` host (why #2573 didn't close this).
    expect(tokenIn(declared.get('background')), 'the unavailable ground').toBe(
      '--control-off-fill',
    )
    expect(tokenIn(declared.get('color')), 'the unavailable ink').toBe('--control-off-ink')
    // Required: `.cm-placeholder` paints with `var(--label-ink)`, not `color`.
    expect(tokenIn(declared.get('--label-ink')), 'the placeholder seam').toBe(
      '--control-off-ink',
    )
  })

  it('beats the skin, because the live paint is inline and inline always wins', () => {
    // `fieldBox` puts `background`/`color` in the style attribute in all eight archetypes.
    const declared = declarations(UNAVAILABLE)
    for (const property of ['background', 'color']) {
      expect(declared.get(property), `${property} is !important`).toMatch(/!important$/)
    }
  })

  for (const theme of BOTH_THEMES) {
    it(`lands the placeholder on ONE opaque ground — ${theme}`, () => {
      const fill = resolve('--control-off-fill', theme)
      // An alpha would put eight sheets back under the placeholder: eight ratios, not one.
      expect(fill.a, 'the unavailable fill is opaque').toBe(1)
      const ratio = contrastRatio(resolve('--control-off-ink', theme), fill)
      expect(
        ratio,
        `the placeholder reads ${formatRatio(ratio)} on its own fill`,
      ).toBeGreaterThanOrEqual(AA_NORMAL)
    })
  }
})

describe('the Singularity terminal re-points the pair, and lands somewhere', () => {
  /**
   * ΔE floor: S.N.I.D.E. light (3.4) is the smallest shift the house neutral
   * makes. A distance, not a ratio: indistinguishable grounds are one ground (#1549).
   */
  const VISIBLE = 3

  it('is a SECOND ground, not a second vocabulary', () => {
    const declared = declarations('.sg-composer-off')
    // Both halves move or neither (the pair invariant in `factionRoles.ts`).
    expect(tokenIn(declared.get('--control-off-fill')), 'the terminal ground').toMatch(
      /^--faction-singularity-term-/,
    )
    expect(tokenIn(declared.get('--control-off-ink')), 'the terminal ink').toMatch(
      /^--faction-singularity-term-/,
    )
    // Not the panel: this box already IS the panel, so that would move ΔE 0.0.
    expect(tokenIn(declared.get('--control-off-fill'))).not.toBe(
      '--faction-singularity-term-panel',
    )
  })

  it('is worn by the Singularity composer and by nothing else', () => {
    // The class is inert unless the host carries it.
    expect(source('SingularityEditPraxis.tsx')).toContain('className: "sg-composer-off"')
    for (const skin of SKINS) {
      if (skin.key === 'singularity') continue
      expect(source(skin.source), `${skin.key} takes the house neutral`).not.toContain(
        'sg-composer-off',
      )
    }
  })

  for (const theme of BOTH_THEMES) {
    it(`is legible on itself and visibly off the live field — ${theme}`, () => {
      const declared = declarations('.sg-composer-off')
      const fill = resolve(tokenIn(declared.get('--control-off-fill'))!, theme)
      const ink = resolve(tokenIn(declared.get('--control-off-ink'))!, theme)
      const live = resolve('--faction-singularity-term-panel', theme)

      const ratio = contrastRatio(ink, fill)
      expect(
        ratio,
        `the terminal's unavailable placeholder is ${formatRatio(ratio)}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL)

      const gap = deltaE76(fill, live)
      expect(
        gap,
        `the unavailable ground is ΔE ${gap.toFixed(1)} off the live field`,
      ).toBeGreaterThanOrEqual(VISIBLE)
    })
  }
})

describe('and 0.6 would still put the placeholder under AA (#2574)', () => {
  /**
   * The old `ponytail:` in `controls.tsx` invited an opacity token. Two guards:
   * no opacity in source, and the arithmetic, so the refusal survives re-derivation.
   */
  it('controls.tsx no longer dims the host', () => {
    const text = source('controls.tsx')
    const dress = text.slice(text.indexOf('const BODY_UNAVAILABLE_STYLE'))
    expect(dress.slice(0, dress.indexOf('}')), 'the unavailable dress').not.toContain('opacity')
    // A repointable opacity token is still an opacity. Matches the declaration,
    // since the name appears in prose.
    expect(stripComments(CSS), 'no parallel opacity family was minted').not.toMatch(
      /--composer-unavailable-[\w-]*\s*:/,
    )
  })

  for (const theme of BOTH_THEMES) {
    for (const skin of SKINS) {
      it(`${skin.key} — ${theme}`, () => {
        const sheet = resolve(skin.sheet, theme)
        const dim = (colour: Rgba) => compositeOver({ ...colour, a: REFUSED_ALPHA }, sheet)
        const ratio = contrastRatio(
          dim(resolve(skin.placeholder, theme)),
          dim(resolve(skin.field, theme)),
        )
        expect(
          ratio,
          `at ${REFUSED_ALPHA} the ${skin.key} placeholder is ${formatRatio(ratio)} on its own faded ground`,
        ).toBeLessThan(AA_NORMAL)
      })
    }
  }
})

describe('keeps the manifest in step with the skins it claims to measure', () => {
  // Hand-written rows rot; the skin must still name the token.
  for (const skin of SKINS) {
    it(`${skin.key} still dresses its write-up box with ${skin.field}`, () => {
      // Ephemerists names its plate tokens in the shared mark module.
      const text =
        skin.key === 'ephemerists'
          ? readFileSync(
              fileURLToPath(
                new URL('../../../../components/factionMarks/ephemeristsPlate.tsx', import.meta.url),
              ),
              'utf8',
            )
          : source(skin.source)
      expect(text).toContain(skin.field)
    })
  }
})
