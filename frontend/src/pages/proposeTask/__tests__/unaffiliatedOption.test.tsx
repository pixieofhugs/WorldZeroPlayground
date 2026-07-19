/**
 * Unaffiliated task proposal (#704). The backend has always accepted a null
 * `primary_faction_slug` and stored the `na` sentinel; the form was the gap —
 * it defaulted to UA and offered no control that could produce `na`.
 *
 * No jsdom in this repo, so we assert on renderToStaticMarkup output. That is
 * enough here because DefaultProposeTask is a pure function of the state prop.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so copy keys resolve to English text.
import '../../../i18n'
import DefaultProposeTask from '../archetypes/DefaultProposeTask'
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from '../useProposeTask'

function state(overrides: Partial<ProposeTaskState> = {}): ProposeTaskState {
  return {
    isLoggedIn: true,
    canProposeTask: true,
    canProposeMetatask: false,
    currentLevel: 6,
    success: false,
    factions: [],
    title: '',
    setTitle: () => {},
    description: '',
    setDescription: () => {},
    pointValue: '10',
    setPointValue: () => {},
    levelRequired: 0,
    setLevelRequired: () => {},
    factionSlug: UNAFFILIATED_FACTION_SLUG,
    setFactionSlug: () => {},
    notes: '',
    setNotes: () => {},
    isMetaTask: false,
    setIsMetaTask: () => {},
    metaBonusValue: '10',
    setMetaBonusValue: () => {},
    submitting: false,
    error: null,
    handleSubmit: async () => {},
    handleCancel: () => {},
    ...overrides,
  }
}

function render(overrides: Partial<ProposeTaskState> = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DefaultProposeTask state={state(overrides)} />
    </MemoryRouter>,
  )
}

describe('propose task — unaffiliated option', () => {
  it('offers an unaffiliated choice alongside the real factions', () => {
    const text = render().replace(/<[^>]*>/g, '')
    expect(text).toContain('Unaffiliated')
    expect(text).toContain('Anyone')
    // The registry factions are still listed.
    expect(text).toContain('Everymen')
  })

  it('gives the unaffiliated pennant the rainbow, never a borrowed faction hue', () => {
    // ADR-0039: `na` has no hue, so it takes the spectrum as a frame rather
    // than resolving to `default` grey or impersonating UA orange (#749).
    expect(render()).toContain('--faction-default-rainbow')
  })

  it('keeps a real faction on its solid hue', () => {
    expect(render({ factionSlug: 'ua' })).toContain('var(--faction-ua)')
  })

  it('tells a metatask author to pick a faction while unaffiliated', () => {
    const unaffiliated = render({ canProposeMetatask: true }).replace(
      /<[^>]*>/g,
      '',
    )
    expect(unaffiliated).toContain('meta tasks must belong to one')

    const affiliated = render({
      canProposeMetatask: true,
      factionSlug: 'wow',
    }).replace(/<[^>]*>/g, '')
    expect(affiliated).toContain('applies as a bonus to all')
  })
})
