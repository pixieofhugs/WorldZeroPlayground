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
 * two files come to disagree about one measurement, and this family has
 * red-mained `main` twice that way:
 *
 *  - `--faction-default-card-text` (headings, typed values) and
 *    `--faction-default-composer-faint` (labels, counters, the exits) on the
 *    washed sheet, plus the refusal of `--faction-default-card-muted` there:
 *    `pages/editPraxis/archetypes/__tests__/composerGround.test.ts`.
 *  - `--faction-default-card-muted` on the opaque well, and
 *    `--faction-default-card-alarm` bare on the washed sheet with
 *    `--color-danger`'s refusal beside it:
 *    `pages/characterPaths/__tests__/createCharacterContrast.test.ts`.
 *  - the 1.4.11 EDGE of every well on this stock, both sides, both cascades,
 *    for all three surfaces the na composer dress paints:
 *    `pages/editPraxis/archetypes/__tests__/defaultComposerDressEdges.test.tsx`.
 *
 * What is left, and what is below: the app-chrome control rows this page mounts
 * and no other na surface does, the counter's two rungs, and the preview chit's
 * one functional hue.
 *
 * ## The claims are on RENDERED markup wherever a claim can be
 *
 * A contrast file measures tokens, but "this page draws that token, there" is a
 * fact about the page — and the first version of this file asserted it by
 * searching the SOURCE for `const EDGE = MUTED` and counting an identifier's
 * occurrences. That pins formatting rather than paint: it breaks on a rename
 * that changes nothing, and it passes for a file that declares a token and
 * never draws it. The rows below read `renderToStaticMarkup` the way
 * `proposeTaskStructure.test.tsx` reads placement. The one exception is stated
 * where it is made — a token this file must NOT declare cannot be read off a
 * page that does not draw it.
 *
 * ## The aurora is modelled, not transcribed
 *
 * `naWashedSheet` in `utils/__tests__/cssVars.ts`: seven radial stops, each
 * peaking at its own anchor, desaturated by `--faction-default-aurora-filter`
 * and (in dark) screen-blended, before `--faction-default-aurora-opacity` lands
 * them on the sheet. Every number is resolved out of `index.css`, so re-tuning
 * the wash re-runs the sum instead of leaving this asserting a stock nobody
 * paints. It lived in four test files until #2993 moved it beside the resolver
 * it is built out of.
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
 * The archetype's CODE, with its prose removed.
 *
 * Used by exactly one row — the one asserting a token is NOT declared — because
 * that claim cannot be made against markup: a page that does not draw a token
 * renders no trace of it either way, so the render would pass whatever the file
 * says. Comments are stripped because this file's subject explains at length
 * which inks the page refused, and a raw scan finds `--color-warning` in the
 * sentence saying it was refused.
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
    // Rendered, not counted in source: a plate that is declared and not spread
    // is not a plate. The chit needs a title to exist at all, so it is rendered
    // with one — and the count is exact, because a fourth would mean a region
    // grew a plate nobody measured.
    expect(render({ title: 'Bake something' }).split(WELL_PLATE).length - 1).toBe(3)
  })

  it('the target-faction row is one of them', () => {
    // The row this issue moved into the sheet, and the one whose ink fails on
    // the bare sheet. Read off the radiogroup's own tag rather than the count,
    // so a well drawn somewhere else cannot stand in for this one.
    expect(styleOf(PAGE, /<div role="radiogroup"[^>]*>/)).toContain(`background:var(${WELL})`)
  })

  it('the level row is the other control on a well', () => {
    // `FilterLevelNodes` draws `<div class="flex flex-wrap items-center">`; the
    // div wrapping it is the plate.
    expect(
      styleOf(PAGE, /<div style="[^"]*"><div class="flex flex-wrap items-center"/),
    ).toContain(`background:var(${WELL})`)
  })

  it('the two controls still paint the global tiers this file measures', () => {
    // The premise. These are somebody else's components; if either stopped
    // reading `--color-bg-surface` or the neutral tiers, every ratio below
    // would be about paint that is no longer there.
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
    // What makes the well a different ground rather than one wash apart. If it
    // ever gained an alpha, every row below would silently become the
    // optimistic reading.
    expect(resolve(WELL, theme).a, 'the well grounds the controls opaquely').toBe(1)
  })

  for (const theme of BOTH_THEMES) {
    const unpickedGround = (t: Theme) =>
      compositeOver(resolve('--color-bg-surface', t), resolve(WELL, t))

    it(`an unpicked chip and an inactive node clear AA on the well — ${theme}`, () => {
      // The quiet tier AND `Chip`'s 0.88 fade, which is the tightest state this
      // row draws: the label fades toward its own ground, and the ground fades
      // toward the well.
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
    // The defect the well prevents, kept as a live row rather than as prose:
    // 3.55:1 at the worst aurora stop. Light is not the miss (5.80), which is
    // why this reads dark only — a light-only check would have shipped it.
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
 * A selected `Chip` REPAINTS its own ground, and on this page it always takes
 * the branch that paints it OPAQUE: `factionFill(null, 'frame')` lays
 * `--faction-default-card-bg` on the padding box under the spectrum border,
 * because the only slugs this kit is ever rendered for — `na`, Albescent, a
 * cleared pick — are the ones `isKnownFaction` refuses (ADR-0039, #749, #783).
 * `FilterLevelNodes` takes the identical branch for the identical reason.
 *
 * So the picked label's ground is neither the well nor the sheet, and measuring
 * it as `--color-bg-surface` over the well — which the first version of this
 * file did — is measuring a ground the page never renders. The premise is read
 * off the markup so that a repaint of either control fails here rather than
 * leaving the row measuring the wrong stock.
 * ========================================================================== */

describe('a picked chip repaints its own ground, and it is opaque', () => {
  it('the picked row draws the spectrum frame over the card stock', () => {
    // `na` is the state the form opens in, so the unaffiliated chip is picked in
    // `PAGE`. Both halves are asserted: the opaque interior the label sits on,
    // and the ramp that makes it a frame rather than a fill.
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
    // Opaque, so the aurora underneath is not part of the reading — which is
    // what makes this a different row from the sheet's, six millimetres away.
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
    // THE PAIRED PROOF FOR A DELETED EXEMPTION. This file's line in
    // `.eslint-legacy-faction-ink.txt` came off with the rebuild, and the rule
    // is a ratchet: the list only ever shrinks, so nothing stops a later edit
    // reintroducing a tier here except the rule itself.
    //
    // THE ONE SOURCE ROW IN THIS FILE, and it has to be: a page that does not
    // draw a token renders no trace of it, so the same claim made against
    // markup would pass whatever the file declared. It is about the archetype's
    // OWN declarations — `Chip` and `FilterLevelNodes` are shared components
    // that carry the app's tiers inside themselves, which is not something this
    // file can lint away and is why the rows above measure them on a well.
    expect(ARCHETYPE, 'the loud tier').not.toContain('--color-text-primary')
    expect(ARCHETYPE, 'the quiet tier').not.toContain('--color-text-secondary')
    expect(ARCHETYPE, 'the faint tier').not.toContain('--color-text-tertiary')
  })
})

/* ========================================================================== *
 * THE COUNTER'S TWO RUNGS (#1609)
 *
 * A counter that turns colour as it APPROACHES a limit is a warning; the
 * over-length message at the cap is an error. Both tiers survive the move — in
 * na's own family, because both of the app's functional inks miss on this sheet.
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
    // The swap asserted on the page rather than on the source: at the cap the
    // counter leaves the notice for the alarm and the over-length message is
    // drawn in it. `unaffiliatedOption`'s "no `--color-danger`" row passes
    // against the pre-#2993 file, because that file only drew the danger ink in
    // this state — which no row rendered.
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
    // The third consumer, and the one `ErrorBanner` would otherwise default to
    // `--color-danger` for (#1231).
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
    // Drawn bare on the sheet here (the counter and the message), which is the
    // same ground `createCharacterContrast` measures it on — restated because
    // this page is the one that draws it at a THRESHOLD, and a row that goes
    // red should name the surface a reader is looking at.
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
    // The ink this page moved OFF, and the reason it had to. Walk it far enough
    // to clear and the archetype can go back to `.warning-text`, which is the
    // outcome worth catching. Dark was never the miss (6.14), the same shape
    // `--color-danger` has one rung down.
    const ratio = worstOn(resolve('--color-warning', 'light'), naWashedSheet('light', THEMES))
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
    const washed = worstOn(ink, naWashedSheet(theme, THEMES))
    expect(washed, `flat ${formatRatio(flat)} vs washed ${formatRatio(washed)}`).toBeLessThan(flat)
  })
})

/* ========================================================================== *
 * THE PREVIEW CHIT
 * ========================================================================== */

describe('the live preview reads on the plate it moved onto', () => {
  it('the bonus line is drawn on the well, not bare on the sheet', () => {
    // The chit is the third `wellStyle` mount, and this is the ink that needs it
    // to be: `--color-success` has the least room of anything on this page.
    const chit = render({ isMetatask: true, canProposeMetatask: true, title: 'Bake something' })
    expect(chit).toContain(WELL_PLATE)
    expect(chit, 'the bonus line keeps the app’s success hue').toContain('color:var(--color-success)')
  })

  it.each(BOTH_THEMES)('and it clears AA there — %s', (theme) => {
    // The one app functional hue this page keeps. It is a HUE and not a
    // `--color-text-*` tier, it is what a metatask's bonus has always been drawn
    // in, and on the opaque well it clears with room — so it moves house with
    // the chit rather than being dropped the way Coven dropped it onto ward
    // paper it had no reading on.
    const ratio = contrastRatio(resolve('--color-success', theme), resolve(WELL, theme))
    expect(ratio, `--color-success on the well is ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(
      AA_NORMAL,
    )
  })
})
