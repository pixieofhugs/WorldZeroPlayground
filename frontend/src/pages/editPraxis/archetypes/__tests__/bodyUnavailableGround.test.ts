/**
 * What the unavailable write-up box actually paints, and what it is forbidden
 * to go back to (#2574).
 *
 * ## The seam
 *
 * The COMPOSITE, not the declared token and not the rendered markup —
 * `bodyUnavailableDress.test.tsx` owns the markup half (the attributes, the
 * notice, the cursor) and stays green either way. What is measured here is the
 * pair the box paints with while `aria-disabled` is on it: the ground the
 * `[data-composer-body][aria-disabled="true"]` rule in `index.css` declares,
 * and the ink `--label-ink` resolves to inside it, which is what CodeMirror's
 * `.cm-placeholder` reads (`bodyEditorTheme.ts`) and is the ONLY text in the
 * box before the seed lands.
 *
 * ## Why the file exists at all
 *
 * `#2566` dressed this state with `opacity: 0.6` and said so in a `ponytail:` —
 * one ratio for eight skins in two themes, never measured, with a
 * `--composer-unavailable-opacity` custom property named as the upgrade path.
 * The measurement says the upgrade path was the wrong one: the number was not
 * mis-tuned, the INSTRUMENT was wrong.
 *
 * `opacity` composites an element as a group, so the field's ground fades
 * toward the composer sheet and the placeholder fades over the faded ground —
 * the ink loses contrast twice, which is #2486's ruling verbatim, at its sixth
 * site. Against the real composited ground the placeholder went from 5.52–9.13:1
 * live to **2.74–4.11:1**: all sixteen pairings under AA, nine under 3:1.
 *
 * And no alpha rescues it, which is the finding worth keeping. Every composer
 * field is the same family of stock as the sheet behind it, so fading one
 * toward the other spends the whole budget on the ink and buys almost no
 * ground: at 0.6 the ground moves ΔE 1.0–6.5 (five of sixteen at or below the
 * just-noticeable threshold), and by 0.85 — where the ink is still 4.38:1 in
 * dark — the median ground shift is ΔE 1.7–2.2. There is no value that reads as
 * disabled and stays legible.
 *
 * ## The refusal is measured on the OPTIMISTIC ground, on purpose
 *
 * `composerGround.test.ts` models the five washed composer sheets layer by
 * layer, and re-deriving that model here would be a second copy of it free to
 * drift. It is not needed: the wash is a TIGHTER reading than the bare sheet
 * (that file proves the direction), so a refusal that holds on the bare sheet
 * holds on the composite. The numbers in the paragraphs above are the washed
 * ones; the numbers this file asserts are the flattering ones, and they still
 * miss.
 *
 * ## By name, not by count
 *
 * A census that counts sites lets a new one be wrong twice, so nothing here
 * counts anything. The rule is read out of the stylesheet and its three
 * declarations are named; the Singularity override is read out of the
 * stylesheet and both its halves are named; and the archetype that wears it is
 * named. The house pair's own ratio (6.31:1 / 6.49:1) is NOT restated — it is
 * gated in `characterPaths/__tests__/disabledControlContrast.test.ts`, which
 * owns `--control-off-*`, and a second name for one measurement is what that
 * file and `factionContrast.test.ts` both spend paragraphs warning against.
 * What is asserted instead is the thing that is new: that this box reads that
 * pair, that its fill is opaque so there is one ratio rather than eight, and
 * that the one skin re-pointing it lands somewhere legible and visible.
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

const CSS_PATH = fileURLToPath(new URL('../../../../index.css', import.meta.url))
const CSS = readFileSync(CSS_PATH, 'utf8')
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
 * Every declaration of one rule, by exact selector — properties as well as
 * custom properties.
 *
 * `declarationsIn` from `cssVars` reads only `--custom` names, which is all
 * `disabledControlContrast.test.ts` needs of `.sg-control-off`. This rule's
 * subject is a `background` and a `color`, so it needs the plain half too.
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
 * Every composer's write-up box: the ground it draws live, the sheet behind it,
 * and the ink its placeholder takes.
 *
 * Eight rows, not nine — `na` and `albescent` both resolve to `default`
 * (ADR-0039), the same split `roomPresenceContrast.test.ts` makes one directory
 * up. `placeholder` is `--label-ink` as it resolves inside that skin: the
 * global unset everywhere but the two near-black composers, which re-point the
 * seam on their own root (#1819) — the Ephemerists plate (#1800) and, since
 * #2831, the Singularity terminal.
 *
 * `source` is the parity guard's anchor. These rows are hand-written and can rot
 * the moment an archetype repoints its field, so the last block below checks
 * the skin still names the token this file measures.
 */
const SKINS = [
  { key: 'na', field: '--faction-default-composer-field', sheet: '--faction-default-card-bg', placeholder: '--color-text-tertiary', source: 'DefaultEditPraxis.tsx' },
  { key: 'ua', field: '--faction-ua-panel', sheet: '--faction-ua-card-bg', placeholder: '--color-text-tertiary', source: 'UaEditPraxis.tsx' },
  { key: 'wow', field: '--faction-wow-chronicle-panel', sheet: '--faction-wow-card-bg', placeholder: '--color-text-tertiary', source: 'WowEditPraxis.tsx' },
  { key: 'coven', field: '--faction-coven-ward-page', sheet: '--faction-coven-ward-card', placeholder: '--color-text-tertiary', source: 'CovenEditPraxis.tsx' },
  { key: 'snide', field: '--faction-snide-composer-field', sheet: '--faction-snide-composer-sheet', placeholder: '--color-text-tertiary', source: 'SnideEditPraxis.tsx' },
  { key: 'ephemerists', field: '--faction-ephemerists-plate-inner', sheet: '--faction-ephemerists-plate-bg', placeholder: '--faction-ephemerists-plate-quiet', source: 'EphemeristsEditPraxis.tsx' },
  { key: 'singularity', field: '--faction-singularity-term-panel', sheet: '--faction-singularity-term-bg', placeholder: '--faction-singularity-term-dim', source: 'SingularityEditPraxis.tsx' },
  { key: 'everymen', field: '--faction-everymen-sheet-panel', sheet: '--everymen-paper', placeholder: '--color-text-tertiary', source: 'EverymenEditPraxis.tsx' },
] as const

/** The alpha #2566 shipped, and the one this file exists to keep out. */
const REFUSED_ALPHA = 0.6

describe('the unavailable write-up box reads #2573’s pair, not an opacity', () => {
  it('grounds and inks itself from --control-off-*, and re-points the label seam', () => {
    const declared = declarations(UNAVAILABLE)
    // The two `.control-off:disabled` already declares, on a selector that can
    // reach a `contenteditable` host — which is the whole reason #2574 is not
    // closed by #2573.
    expect(tokenIn(declared.get('background')), 'the unavailable ground').toBe(
      '--control-off-fill',
    )
    expect(tokenIn(declared.get('color')), 'the unavailable ink').toBe('--control-off-ink')
    // And the third, which is NOT optional. The only text in this box before
    // the seed is CodeMirror's placeholder, and `bodyEditorTheme.ts` paints
    // `.cm-placeholder` with `var(--label-ink)` rather than with `color` — so
    // without this line the one visible string keeps the skin's own quiet tier
    // over a ground it was never measured against.
    expect(tokenIn(declared.get('--label-ink')), 'the placeholder seam').toBe(
      '--control-off-ink',
    )
  })

  it('beats the skin, because the live paint is inline and inline always wins', () => {
    // `fieldBox` is spread into `textareaStyle` in all eight archetypes, which
    // puts `background` and `color` in the style attribute. A rule a skin could
    // out-specify is the pattern this replaces — the same reason
    // `.control-off:disabled` states.
    const declared = declarations(UNAVAILABLE)
    for (const property of ['background', 'color']) {
      expect(declared.get(property), `${property} is !important`).toMatch(/!important$/)
    }
  })

  for (const theme of BOTH_THEMES) {
    it(`lands the placeholder on ONE opaque ground — ${theme}`, () => {
      const fill = resolve('--control-off-fill', theme)
      // The load-bearing half of replacing the fill instead of fading it: an
      // alpha here would put eight faction sheets back under the placeholder
      // and there would be eight ratios again instead of one.
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
   * ΔE 3.4 is S.N.I.D.E. in light — the SMALLEST ground shift the house neutral
   * makes against any of the eight live fields, and therefore the floor an
   * override has to clear to be doing the same job. It is a distance and not a
   * ratio for the reason #1549 records: two grounds a viewer cannot tell apart
   * are one ground with two names, and a contrast ratio cannot see that.
   */
  const VISIBLE = 3

  it('is a SECOND ground, not a second vocabulary', () => {
    const declared = declarations('.sg-composer-off')
    // Both halves move or neither does — the pair invariant `factionRoles.ts`
    // spells in its type. A fill whose paired ink stays behind is a contrast
    // bug with no name to fix it at.
    expect(tokenIn(declared.get('--control-off-fill')), 'the terminal ground').toMatch(
      /^--faction-singularity-term-/,
    )
    expect(tokenIn(declared.get('--control-off-ink')), 'the terminal ink').toMatch(
      /^--faction-singularity-term-/,
    )
    // And it must not be the panel, which is what `.sg-control-off` hands the
    // publish BAND. That band sits on the chassis, so the panel is a raised box
    // and a visible change; this box already IS the panel, so the same override
    // would move the ground ΔE 0.0 and say nothing at all.
    expect(tokenIn(declared.get('--control-off-fill'))).not.toBe(
      '--faction-singularity-term-panel',
    )
  })

  it('is worn by the Singularity composer and by nothing else', () => {
    // The class is inert on its own — it declares two custom properties and
    // nothing reads them until `aria-disabled` lands on the host. It is only a
    // fix if the host actually carries it.
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
   * The load-bearing half. A value in a stylesheet does not stop the next
   * editor spelling `opacity` on this host again, and the `ponytail:` that used
   * to sit in `controls.tsx` actively invited it — it named
   * `--composer-unavailable-opacity` as the upgrade path.
   *
   * Two guards, and both are needed. The first is the source: no opacity keyed
   * on the seed gate. The second is the arithmetic, so the refusal survives
   * being re-derived: `opacity` composites the element as a group, so BOTH the
   * ground and the ink fade toward the sheet at the same alpha, and the ratio
   * between the two results is what a player reads.
   */
  it('controls.tsx no longer dims the host', () => {
    const text = source('controls.tsx')
    const dress = text.slice(text.indexOf('const BODY_UNAVAILABLE_STYLE'))
    expect(dress.slice(0, dress.indexOf('}')), 'the unavailable dress').not.toContain('opacity')
    // The upgrade path the old ponytail proposed, refused by measurement rather
    // than by taste — a token a skin could repoint is still an opacity, and the
    // alpha sweep says none of them work. Named in prose in both files, which is
    // why this looks for the DECLARATION and not for the string.
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
  // Hand-written rows rot the moment an archetype repoints its field, and a
  // model of a ground nobody paints is a green pass over nothing. The cheapest
  // true anchor: the skin still names the token.
  for (const skin of SKINS) {
    it(`${skin.key} still dresses its write-up box with ${skin.field}`, () => {
      // Ephemerists names its plate primitives in the mark module both the
      // composer and the waiting surface import them from, so the archetype
      // spells the constant rather than the token.
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
