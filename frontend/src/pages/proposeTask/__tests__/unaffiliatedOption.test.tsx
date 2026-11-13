/**
 * Unaffiliated task proposal (#704): the form must be able to produce `na`.
 * Asserted on renderToStaticMarkup (archetypes are pure functions of state).
 *
 * Two blocks (#2538): the first is what every archetype must keep, derived from
 * `surfaceMap('proposeTask')`. The second is the na kit's dress and names
 * `DefaultProposeTask` deliberately; faction kits would fail it by doing their job.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
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
    expect(text).toContain('Everymen')
  })

  it('is one radiogroup of eight radios — na plus the seven factions (#1824)', () => {
    const markup = renderFor(slug)
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g)).toHaveLength(8)
    /* Read from the row, not the page (#2995): a kit's nameplate can name a
     * faction above the chips. */
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
 * The na kit's dress on the composer chassis (#2993). Each row would have failed
 * on the file it replaced. Faction pick reskinning lives in
 * `proposeTaskDispatch.test.tsx`.
 */
describe('the na kit wears na, on the sheet it moved to', () => {
  it('gives the unaffiliated chip the rainbow, never a borrowed faction hue', () => {
    // ADR-0039: `na` takes the spectrum, not grey or UA orange (#749).
    expect(render()).toContain('--faction-default-rainbow')
  })

  it('draws that spectrum as the SHEET’s own frame (#2520)', () => {
    // The border-box idiom the other Default* surfaces wear.
    const markup = render()
    expect(markup).toContain('border:3px solid transparent')
    expect(markup).toContain('background-clip:')
    expect(markup).toContain('var(--faction-default-card-bg)')
  })

  it('stands its fields on na’s own composer stock, not the app’s', () => {
    // Ratios live in `naProposeTaskContrast`; shared chips bring their own
    // neutrals, so they can't be asserted here.
    const markup = render({ title: 'Bake something' })
    expect(markup).toContain('var(--faction-default-composer-field)')
    expect(markup).toContain('var(--faction-default-card-muted)')
    expect(markup, 'the app’s functional red is not a na ink (#1302)').not.toContain(
      'var(--color-danger)',
    )
  })
})
