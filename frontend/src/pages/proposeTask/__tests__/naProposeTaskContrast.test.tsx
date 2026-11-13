/**
 * The na propose form, measured on its `ComposerSheet` ground (#2993): the
 * `--faction-default-card-bg` stock with the aurora washed under it.
 *
 * Only pairings this page is first to draw. Measured elsewhere (don't restate):
 * card-text / composer-faint on the washed sheet — `composerGround.test.ts`;
 * card-muted on the well and card-alarm bare — `createCharacterContrast.test.ts`;
 * well edges — `defaultComposerDressEdges.test.tsx`.
 *
 * Claims read rendered markup, not source, except the one row asserting a token
 * is NOT declared. The aurora is modelled by `naWashedSheet` (`cssVars.ts`) from
 * `index.css`, so retuning the wash re-runs the sum.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import i18n from '../../../i18n'
import {
  AA_NORMAL,
  compositeOver,
  contrastRatio,
  formatRatio,
  parseColor,
  type Rgba,
} from '../../../utils/contrast'
import {
  naWashedSheet,
  readThemes,
  resolveVar,
  type Theme,
} from '../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../test/indexCss'
import DefaultProposeTask from '../archetypes/DefaultProposeTask'
import { proposeTaskState } from './proposeTaskState'
import type { ProposeTaskState } from '../useProposeTask'

const THEMES = readThemes(readIndexCss())
const BOTH_THEMES: Theme[] = ['light', 'dark']

const forms = i18n.getFixedT(null, 'forms')

const source = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

/**
 * The archetype's CODE minus comments, for the one NOT-declared row: markup
 * can't show an absence, and the prose names refused tokens.
 */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const ARCHETYPE = code(source('../archetypes/DefaultProposeTask.tsx'))
const CHIP = source('../../../components/ui/ChipRow.tsx')
const NODES = source('../../../components/ui/FilterLevelNodes.tsx')

const SHEET = '--faction-default-card-bg'
/** The opaque plate the app-chrome rows and the preview chit stand on. */
const WELL = '--faction-default-composer-field'
/** The edge `defaultComposerDressEdges.test.tsx` measures, on both sides. */
const EDGE = '--faction-default-card-muted'

/** The na kit, rendered — the only archetype these rows are about. */
function render(overrides: Partial<ProposeTaskState> = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DefaultProposeTask state={proposeTaskState(overrides)} />
    </MemoryRouter>,
  )
}

const PAGE = render()

function resolve(token: string, theme: Theme): Rgba {
  const raw = resolveVar(token, theme, THEMES)
  expect(raw, `${token} resolves in ${theme}`).not.toBeNull()
  const parsed = parseColor(raw!)
  expect(parsed, `${token} is a colour in ${theme}`).not.toBeNull()
  return parsed!
}

const worstOn = (ink: Rgba, grounds: Rgba[]): number =>
  Math.min(...grounds.map((ground) => contrastRatio(ink, ground)))

/* ========================================================================== *
 * THE APP-CHROME ROWS, AND THE WELL UNDER THEM
 *
 * `Chip` and `FilterLevelNodes` are site chrome painting translucent
 * `--color-bg-surface` with global text tiers, no style hook. On the washed
 * sheet in dark that fails (aurora screen-blend + translucent pill + Chip's
 * 0.88 fade), so both stand on the opaque well. Asserted both ways: clears on
 * the well, still misses on the sheet (else the well is decoration).
 * ========================================================================== */

/** `Chip`'s own fade for an unselected pill. */
const CHIP_FADE = 0.88

/** The whole element at `alpha` over what is behind it — CSS `opacity`. */
const faded = (colour: Rgba, behind: Rgba): Rgba =>
  compositeOver({ ...colour, a: CHIP_FADE }, behind)

/** The style attribute of the first tag matching `pattern`. */
const styleOf = (html: string, pattern: RegExp): string => {
  const tag = pattern.exec(html)?.[0] ?? ''
  return /style="([^"]*)"/.exec(tag)?.[1] ?? ''
}

/** The well's own opening declarations, as React serializes `wellStyle`. */
const WELL_PLATE = `background:var(${WELL});border:1px solid var(${EDGE});border-radius:10px;padding:`

describe('the app-chrome rows stand on a well, and it is load-bearing', () => {
  it('the page draws three of them: the chips, the level row and the chit', () => {
    // Exact: a fourth would be a plate nobody measured. The chit needs a title.
    expect(render({ title: 'Bake something' }).split(WELL_PLATE).length - 1).toBe(3)
  })

  it('the target-faction row is one of them', () => {
    // Read off the radiogroup's own tag, so another well can't stand in.
    expect(styleOf(PAGE, /<div role="radiogroup"[^>]*>/)).toContain(`background:var(${WELL})`)
  })

  it('the level row is the other control on a well', () => {
    // The div wrapping `FilterLevelNodes`' flex row is the plate.
    expect(
      styleOf(PAGE, /<div style="[^"]*"><div class="flex flex-wrap items-center"/),
    ).toContain(`background:var(${WELL})`)
  })

  it('the two controls still paint the global tiers this file measures', () => {
    // The premise: these are someone else's components.
    for (const [what, src] of [['Chip', CHIP], ['FilterLevelNodes', NODES]] as const) {
      expect(src, `${what} grounds itself on the app surface`).toContain('var(--color-bg-surface)')
      expect(src, `${what} inks the loud tier`).toContain('var(--color-text-primary)')
      expect(src, `${what} inks the quiet tier`).toContain('var(--color-text-secondary)')
    }
    expect(
      CHIP.split(String(CHIP_FADE)).length - 1,
      `Chip fades an unselected pill exactly once, at ${CHIP_FADE}`,
    ).toBe(1)
  })

  it.each(BOTH_THEMES)('the well is opaque, so the aurora never reaches them — %s', (theme) => {
    // An alpha here would make every row below the optimistic reading.
    expect(resolve(WELL, theme).a, 'the well grounds the controls opaquely').toBe(1)
  })

  for (const theme of BOTH_THEMES) {
    const unpickedGround = (t: Theme) =>
      compositeOver(resolve('--color-bg-surface', t), resolve(WELL, t))

    it(`an unpicked chip and an inactive node clear AA on the well — ${theme}`, () => {
      // The tightest state: quiet tier plus Chip's 0.88 fade on both layers.
      const ground = unpickedGround(theme)
      const well = resolve(WELL, theme)
      const flat = contrastRatio(resolve('--color-text-secondary', theme), ground)
      const dimmed = contrastRatio(
        faded(resolve('--color-text-secondary', theme), well),
        faded(ground, well),
      )
      expect(flat, `the inactive node is ${formatRatio(flat)}`).toBeGreaterThanOrEqual(AA_NORMAL)
      expect(
        dimmed,
        `an unpicked chip at ${CHIP_FADE} is ${formatRatio(dimmed)}`,
      ).toBeGreaterThanOrEqual(AA_NORMAL)
    })
  }

  it('and on the bare sheet the same chip would MISS — dark', () => {
    // 3.55:1 at the worst aurora stop; light is not the miss (5.80).
    const grounds = naWashedSheet('dark', THEMES)
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
 * THE PICKED ROW, WHICH IS NOT ON THE WELL AT ALL
 *
 * A selected `Chip` paints its own OPAQUE `--faction-default-card-bg` under the
 * spectrum border (`factionFill(null, 'frame')`): this kit only renders for
 * slugs `isKnownFaction` refuses (ADR-0039). `FilterLevelNodes` likewise. The
 * premise is read off markup so a repaint fails here.
 * ========================================================================== */

describe('a picked chip repaints its own ground, and it is opaque', () => {
  it('the picked row draws the spectrum frame over the card stock', () => {
    // `na` is the opening state, so the unaffiliated chip is picked in `PAGE`.
    const chip = /<button[^>]*role="radio"[^>]*aria-checked="true"[^>]*>/.exec(PAGE)?.[0] ?? ''
    expect(chip, 'a picked chip is drawn').not.toBe('')
    expect(chip, 'the interior is the card stock, laid on the padding box').toContain(
      `linear-gradient(var(${SHEET}), var(${SHEET})) padding-box`,
    )
    expect(chip, 'and the spectrum is the border box').toContain(
      'var(--faction-default-rainbow) border-box',
    )
  })

  it.each(BOTH_THEMES)('the picked label clears AA on that stock — %s', (theme) => {
    // Opaque, so the aurora is not part of the reading.
    const stock = resolve(SHEET, theme)
    expect(stock.a, 'the picked chip’s interior is opaque').toBe(1)
    const ratio = contrastRatio(resolve('--color-text-primary', theme), stock)
    expect(
      ratio,
      `--color-text-primary on var(${SHEET}) is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })
})

/* ========================================================================== *
 * THE GROUND MOVE IS WHY THE LINT EXEMPTION COULD GO
 * ========================================================================== */

describe('the ground move is why the lint exemption could go', () => {
  it('the archetype writes no global ink tier of its own', () => {
    // Pairs with the deleted `.eslint-legacy-faction-ink.txt` line (a ratchet).
    // A source row because markup can't show an absence; it covers only the
    // archetype's OWN declarations, not the shared controls.
    expect(ARCHETYPE, 'the loud tier').not.toContain('--color-text-primary')
    expect(ARCHETYPE, 'the quiet tier').not.toContain('--color-text-secondary')
    expect(ARCHETYPE, 'the faint tier').not.toContain('--color-text-tertiary')
  })
})

/* ========================================================================== *
 * THE COUNTER'S TWO RUNGS (#1609): approach = warning, cap = error, both in
 * na's family because the app's functional inks miss on this sheet.
 * ========================================================================== */

const TITLE_MAX = 200

describe('the counter keeps both of #1609’s rungs, in na’s family', () => {
  it('the approach rung is drawn at the threshold, and it is na’s notice ink', () => {
    const approaching = render({ title: 'x'.repeat(180) })
    expect(approaching, 'the counter turns before the cap').toContain(
      'color:var(--faction-default-card-notice)',
    )
    expect(
      render(),
      'and it is quiet until it does',
    ).not.toContain('color:var(--faction-default-card-notice)')
  })

  it('the cap draws the alarm rung, on the counter AND on the message', () => {
    // On the page, not source: the pre-#2993 file only drew danger in this
    // state, which no row rendered.
    const atCap = render({ title: 'x'.repeat(TITLE_MAX) })
    expect(atCap, 'the over-length message is drawn at the cap').toContain(
      forms('proposeTask.fields.name.tooLong'),
    )
    expect(atCap.split('color:var(--faction-default-card-alarm)').length - 1, 'counter and message')
      .toBeGreaterThanOrEqual(2)
    expect(atCap, 'the app’s functional red is not a na ink (#1302)').not.toContain(
      'var(--color-danger)',
    )
  })

  it('the error banner takes the same alarm rung', () => {
    // `ErrorBanner` would otherwise default to `--color-danger` (#1231).
    const failed = render({ error: 'Something went wrong.' })
    expect(failed).toContain('color:var(--faction-default-card-alarm)')
    expect(failed, 'the neutral red is 3.37:1 on this sheet').not.toContain('var(--color-danger)')
  })

  it('and no `.warning-text` survived the move', () => {
    expect(PAGE, 'the app class the counter left').not.toContain('warning-text')
    expect(PAGE, 'and the app ink under it').not.toContain('var(--color-warning)')
  })

  it.each(BOTH_THEMES)('the approach rung clears AA on the washed sheet — %s', (theme) => {
    const ratio = worstOn(
      resolve('--faction-default-card-notice', theme),
      naWashedSheet(theme, THEMES),
    )
    expect(
      ratio,
      `--faction-default-card-notice on the composite is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  it.each(BOTH_THEMES)('the alarm rung clears it too — %s', (theme) => {
    // Restated from `createCharacterContrast`: this page draws it at a threshold.
    const ratio = worstOn(
      resolve('--faction-default-card-alarm', theme),
      naWashedSheet(theme, THEMES),
    )
    expect(
      ratio,
      `--faction-default-card-alarm on the composite is ${formatRatio(ratio)}`,
    ).toBeGreaterThanOrEqual(AA_NORMAL)
  })

  it('and the app’s own `--color-warning` still would not — light', () => {
    // If it ever clears, the archetype can return to `.warning-text`. Dark was
    // never the miss (6.14).
    const ratio = worstOn(resolve('--color-warning', 'light'), naWashedSheet('light', THEMES))
    expect(ratio, `--color-warning on the composite is ${formatRatio(ratio)}`).toBeLessThan(
      AA_NORMAL,
    )
  })

  it.each(BOTH_THEMES)('the wash is the tighter reading, not the flatterer — %s', (theme) => {
    // Else measuring the composite would be the optimistic reading.
    const ink = resolve('--faction-default-card-notice', theme)
    const flat = contrastRatio(ink, resolve(SHEET, theme))
    const washed = worstOn(ink, naWashedSheet(theme, THEMES))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})

/* ========================================================================== *
 * THE PREVIEW CHIT
 * ========================================================================== */

describe('the live preview reads on the plate it moved onto', () => {
  it('the bonus line is drawn on the well, not bare on the sheet', () => {
    // The third `wellStyle` mount; `--color-success` has the least room here.
    const chit = render({ isMetatask: true, canProposeMetatask: true, title: 'Bake something' })
    expect(chit).toContain(WELL_PLATE)
    expect(chit, 'the bonus line keeps the app’s success hue').toContain('color:var(--color-success)')
  })

  it.each(BOTH_THEMES)('and it clears AA there — %s', (theme) => {
    // The one app functional hue this page keeps; it clears on the opaque well.
    const ratio = contrastRatio(resolve('--color-success', theme), resolve(WELL, theme))
    expect(ratio, `--color-success on the well is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})
