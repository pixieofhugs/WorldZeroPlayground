/**
 * Unaffiliated task proposal (#704). The backend has always accepted a null
 * `primary_faction_slug` and stored the `na` sentinel; the form was the gap —
 * it defaulted to UA and offered no control that could produce `na`.
 *
 * No jsdom in this repo, so we assert on renderToStaticMarkup output. That is
 * enough here because every propose-task archetype is a pure function of the
 * state prop.
 *
 * TWO BLOCKS SINCE #2538, AND THE SPLIT IS THE POINT. The page dispatches per
 * faction now, so "the form offers an unaffiliated choice" is a claim about
 * eight forms and was being made about one. The first block is what every
 * archetype must keep — the option exists, the group is one radiogroup of eight,
 * the metatask control is announceable, the placeholder-only fields are named —
 * and it is DERIVED from `surfaceMap('proposeTask')`, so each archetype of the
 * seven-faction fan-out inherits it the moment it registers.
 *
 * The second block is the na KIT's dress: which token each surface reads. Those
 * assertions name `DefaultProposeTask` directly and deliberately, because a
 * faction archetype draws its own register and would fail them by doing its job.
 * A fan-out PR adds its own contrast/register test beside this one; it does not
 * widen these.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so copy keys resolve to English text.
import '../../../i18n'
import DefaultProposeTask from '../archetypes/DefaultProposeTask'
import { archetypeFor, EVERY_SLUG, proposeTaskState } from './proposeTaskState'
import type { ProposeTaskState } from '../useProposeTask'

/** The archetype the dispatcher would pick for `slug`, rendered. */
function renderFor(slug: string, overrides: Partial<ProposeTaskState> = {}): string {
  const Archetype = archetypeFor(slug)
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={proposeTaskState({ factionSlug: slug, ...overrides })} />
    </MemoryRouter>,
  )
}

/** The na kit specifically, whatever the slug — the dress block below. */
function render(overrides: Partial<ProposeTaskState> = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DefaultProposeTask state={proposeTaskState(overrides)} />
    </MemoryRouter>,
  )
}

describe.each(EVERY_SLUG)('propose task — the faction chips (%s)', (slug) => {
  it('offers an unaffiliated choice alongside the real factions', () => {
    const text = renderFor(slug).replace(/<[^>]*>/g, '')
    expect(text).toContain('Unaffiliated')
    // The registry factions are still listed.
    expect(text).toContain('Everymen')
  })

  it('is one radiogroup of eight radios — na plus the seven factions (#1824)', () => {
    const markup = renderFor(slug)
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g)).toHaveLength(8)
    /* Unaffiliated leads, then the rainbow: everymen is the first faction.
     *
     * READ FROM THE ROW, NOT FROM THE PAGE (#2995). This used to index the
     * whole markup, which held while every kit that names its own faction in
     * chrome — S.N.I.D.E.'s wordmark, UA's band — happened to name one the
     * order does not mention. Everymen's nameplate says "Everymen", and moving
     * its chips inside the sheet put that nameplate above them: a page-wide
     * search then found the masthead and reported the CHIPS out of order.
     * `EverymenProposeTask`'s header had flagged exactly this. The claim was
     * always about the row, so the slice is too. */
    const chips = markup.slice(markup.indexOf('role="radiogroup"'))
    expect(chips.indexOf('Unaffiliated')).toBeLessThan(chips.indexOf('Everymen'))
    expect(chips.indexOf('Everymen')).toBeLessThan(chips.indexOf('Cozy Coven'))
  })

  it('leaves the metatask control announceable without a native checkbox', () => {
    // `accent-color` takes one colour and na's identity is seven (#1824).
    const markup = renderFor(slug, { canProposeMetatask: true })
    expect(markup).toContain('role="checkbox"')
    expect(markup).not.toContain('type="checkbox"')
  })

  it('names the three placeholder-only fields for a screen reader', () => {
    const markup = renderFor(slug)
    expect(markup).toContain('aria-label="Task name"')
    expect(markup).toContain('aria-label="Description"')
    expect(markup).toContain('aria-label="Notes to admin (optional)"')
  })
})

/**
 * THE na KIT'S DRESS — REWRITTEN FOR THE CHASSIS (#2993).
 *
 * This block used to assert that "the selected faction runs through the whole
 * form": the card's gradient frame, the task-name face and the submit pill were
 * four inline styles computed from the picked slug in
 * `proposeTask/factionSurfaces.ts`, and a per-surface accent silently dropping
 * out was the defect worth pinning. Both halves of that premise are gone.
 *
 * The MECHANISM went with #2538: every one of the seven known factions holds a
 * `proposeTask` row, so picking one reskins the page to that faction's own
 * archetype and this kit is on screen only for `na`, Albescent, a cleared pick
 * and an unregistered slug. `isKnownFaction(state.factionSlug)` is false in
 * every one of them, and #2993 deleted the dead arms that branched on it.
 * `proposeTaskDispatch.test.tsx` is where "the pick runs through the whole
 * page" lives now — one slug in, a different component out — and it is a
 * stronger statement than a token scan ever was.
 *
 * The MODULE went with #2993, which rebuilt this kit on the composer chassis.
 *
 * So the rows below assert what is actually true of the rebuilt kit, and each
 * would have failed on the file this replaced: it dresses itself in na's own
 * `--faction-default-*` family on a `ComposerSheet`, its one spectrum is the
 * sheet's frame, and the chip row still carries seven different factions'
 * tints — which is the one place a slug is genuinely read per element, and it
 * is each chip's own rather than the page's.
 *
 * They name `DefaultProposeTask` directly and deliberately: a faction archetype
 * draws its own register and would fail them by doing its job.
 */
describe('the na kit wears na, on the sheet it moved to', () => {
  it('gives the unaffiliated chip the rainbow, never a borrowed faction hue', () => {
    // ADR-0039: `na` has no hue, so it takes the spectrum as a frame rather
    // than resolving to `default` grey or impersonating UA orange (#749).
    expect(render()).toContain('--faction-default-rainbow')
  })

  it('draws that spectrum as the SHEET’s own frame (#2520)', () => {
    // One rainbow on the page, and it is the border-box idiom `DefaultTaskCard`,
    // `DefaultPraxisCard`, `DefaultSeal` and `DefaultEditPraxis` all wear. The
    // 240px bar this kit used to draw under the page title is gone with it.
    const markup = render()
    expect(markup).toContain('border:3px solid transparent')
    expect(markup).toContain('background-clip:')
    expect(markup).toContain('var(--faction-default-card-bg)')
  })

  it('stands its fields on na’s own composer stock, not the app’s', () => {
    // The whole of the ground move: an opaque well in the na family, with the
    // measured edge rather than the 12% hairline. `naProposeTaskContrast` and
    // `defaultComposerDressEdges` carry the ratios, and that file is also where
    // the archetype's OWN code is checked for a global tier — the paired proof
    // for the `.eslint-legacy-faction-ink.txt` line #2993 deleted. It cannot be
    // asserted on the markup: `Chip` and `FilterLevelNodes` are shared
    // components that bring their own neutrals with them, which is why the two
    // control rows are measured on a well over there.
    const markup = render({ title: 'Bake something' })
    expect(markup).toContain('var(--faction-default-composer-field)')
    expect(markup).toContain('var(--faction-default-card-muted)')
    expect(markup, 'the app’s functional red is not a na ink (#1302)').not.toContain(
      'var(--color-danger)',
    )
  })
})
