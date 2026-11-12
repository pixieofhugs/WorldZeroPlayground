/**
 * #894 — the "Create as Metatask" checkbox.
 *  1. Gated on `canProposeMetatask` (from `era.level_to_propose_metatask`);
 *     hidden below the gate.
 *  2. Checked → `proposeMetatask` with the picked faction as
 *     `metatask_faction_slug`, `na` included (Unaffiliated = anyone).
 * Visibility renders every archetype (roster derived, #2538); routing tests the
 * pure planner `planProposalSubmission`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { archetypeFor, EVERY_SLUG, proposeTaskState } from './proposeTaskState'
import {
  UNAFFILIATED_FACTION_SLUG,
  planProposalSubmission,
  type ProposeTaskState,
} from '../useProposeTask'

function renderText(slug: string, overrides: Partial<ProposeTaskState> = {}): string {
  const Archetype = archetypeFor(slug)
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={proposeTaskState({ factionSlug: slug, ...overrides })} />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe.each(EVERY_SLUG)('metatask checkbox — capability gate (%s)', (slug) => {
  it('is hidden below the propose-metatask gate', () => {
    expect(renderText(slug, { canProposeMetatask: false })).not.toContain(
      'Create as Metatask',
    )
  })

  it('appears once the proposer is eligible', () => {
    expect(renderText(slug, { canProposeMetatask: true })).toContain(
      'Create as Metatask',
    )
  })
})

describe('planProposalSubmission — checkbox routes to proposeMetatask', () => {
  const base = {
    title: 'Meditate daily',
    description: 'Sit for ten minutes',
    pointValue: '10',
    metaBonusValue: '25',
    levelRequired: 3 as number | '',
    notes: '',
  }

  it('routes a checked proposal through the metatask endpoint with the picked faction', () => {
    const plan = planProposalSubmission({
      ...base,
      isMetatask: true,
      factionSlug: 'coven',
    })
    expect(plan.kind).toBe('metatask')
    if (plan.kind !== 'metatask') throw new Error('expected metatask plan')
    expect(plan.body.metatask_faction_slug).toBe('coven')
    expect(plan.body.point_value).toBe(25)
    expect(plan.body.level_required).toBe(3)
  })

  it('allows an Unaffiliated (na) metatask — anyone can apply it', () => {
    const plan = planProposalSubmission({
      ...base,
      isMetatask: true,
      factionSlug: UNAFFILIATED_FACTION_SLUG,
    })
    expect(plan.kind).toBe('metatask')
    if (plan.kind !== 'metatask') throw new Error('expected metatask plan')
    expect(plan.body.metatask_faction_slug).toBe(UNAFFILIATED_FACTION_SLUG)
  })

  it('routes an unchecked proposal through the standard task endpoint', () => {
    const plan = planProposalSubmission({
      ...base,
      isMetatask: false,
      factionSlug: 'coven',
    })
    expect(plan.kind).toBe('standard')
    if (plan.kind !== 'standard') throw new Error('expected standard plan')
    expect(plan.body.primary_faction_slug).toBe('coven')
    expect(plan.body.point_value).toBe(10)
  })
})
