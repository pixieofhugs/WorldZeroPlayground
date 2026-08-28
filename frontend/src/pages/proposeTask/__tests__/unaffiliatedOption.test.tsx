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
    // Unaffiliated leads, then the rainbow: everymen is the first faction.
    expect(markup.indexOf('Unaffiliated')).toBeLessThan(markup.indexOf('Everymen'))
    expect(markup.indexOf('Everymen')).toBeLessThan(markup.indexOf('Cozy Coven'))
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

describe('the na kit reads the selected faction through the whole form', () => {
  it('gives the unaffiliated chip the rainbow, never a borrowed faction hue', () => {
    // ADR-0039: `na` has no hue, so it takes the spectrum as a frame rather
    // than resolving to `default` grey or impersonating UA orange (#749).
    expect(render()).toContain('--faction-default-rainbow')
  })

  it('keeps a real faction on its solid hue', () => {
    expect(render({ factionSlug: 'ua' })).toContain('var(--faction-ua)')
  })

  it('runs the selected faction through the whole form, not just the chip', () => {
    // The card frame, the task-name face, the level nodes and the submit pill
    // all read the same slug (factionSurfaces.ts) — that is the point of the
    // change, and a per-surface accent is exactly what silently drops out.
    const markup = render({ factionSlug: 'coven', title: 'Bake something' })
    expect(markup).toContain('var(--faction-coven-card-font)')
    expect(markup).toContain('border:2px solid var(--faction-coven)')
    expect(markup).toContain(
      'color-mix(in srgb, var(--faction-coven) 18%, var(--color-bg-surface))',
    )
    // The card's own frame is the bevelled ramp, over an OPAQUE paper layer.
    expect(markup).toContain('var(--faction-default-card-bg)')
    expect(markup).toContain('background-clip:padding-box, border-box')
  })
})
