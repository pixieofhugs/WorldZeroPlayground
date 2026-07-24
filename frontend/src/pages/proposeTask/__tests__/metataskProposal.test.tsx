/**
 * #894 — wiring the "Create as meta task" checkbox.
 *
 * Two guarantees:
 *  1. The checkbox is gated off the capability seam (`canProposeMetatask`,
 *     which the backend derives from `era.level_to_propose_metatask`). A
 *     sub-gate proposer never sees it (CLAUDE.md "hide unusable controls").
 *  2. When checked, submission routes through `proposeMetatask` carrying the
 *     picked faction as `metatask_faction_slug` — including `na`
 *     (Unaffiliated = anyone), which the old faction guard wrongly rejected.
 *
 * The visibility half renders the pure `DefaultProposeTask` (no DOM needed).
 * The routing half exercises the extracted pure planner `planProposalSubmission`
 * — the repo has no DOM/renderHook, so hooks are tested via their pure core.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import DefaultProposeTask from '../archetypes/DefaultProposeTask'
import {
  UNAFFILIATED_FACTION_SLUG,
  planProposalSubmission,
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

function renderText(overrides: Partial<ProposeTaskState> = {}): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DefaultProposeTask state={state(overrides)} />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe('meta task checkbox — capability gate', () => {
  it('is hidden below the propose-metatask gate', () => {
    expect(renderText({ canProposeMetatask: false })).not.toContain(
      'Create as meta task',
    )
  })

  it('appears once the proposer is eligible', () => {
    expect(renderText({ canProposeMetatask: true })).toContain(
      'Create as meta task',
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
  }

  it('routes a checked proposal through the metatask endpoint with the picked faction', () => {
    const plan = planProposalSubmission({
      ...base,
      isMetaTask: true,
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
      isMetaTask: true,
      factionSlug: UNAFFILIATED_FACTION_SLUG,
    })
    expect(plan.kind).toBe('metatask')
    if (plan.kind !== 'metatask') throw new Error('expected metatask plan')
    expect(plan.body.metatask_faction_slug).toBe(UNAFFILIATED_FACTION_SLUG)
  })

  it('routes an unchecked proposal through the standard task endpoint', () => {
    const plan = planProposalSubmission({
      ...base,
      isMetaTask: false,
      factionSlug: 'coven',
    })
    expect(plan.kind).toBe('standard')
    if (plan.kind !== 'standard') throw new Error('expected standard plan')
    expect(plan.body.primary_faction_slug).toBe('coven')
    expect(plan.body.point_value).toBe(10)
  })
})
