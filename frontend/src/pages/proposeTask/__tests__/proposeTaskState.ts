/**
 * The shared propose-task state fixture and archetype roster (#2538): every
 * archetype is a pure function of `ProposeTaskState`. The roster is derived
 * from `surfaceMap('proposeTask')`; `surfaceDispatch.test.ts` owns the one list.
 * Not a `.test.ts` (vitest skips it) and under `__tests__/` (source scans skip it).
 */
import type { ComponentType } from 'react'

import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import { UNAFFILIATED_FACTION_SLUG, type ProposeTaskState } from '../useProposeTask'

/** An eligible proposer at the opening position: nothing typed, unaffiliated. */
export function proposeTaskState(
  overrides: Partial<ProposeTaskState> = {},
): ProposeTaskState {
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
    isMetatask: false,
    setIsMetatask: () => {},
    metaBonusValue: '10',
    setMetaBonusValue: () => {},
    submitting: false,
    error: null,
    handleSubmit: async () => {},
    handleCancel: () => {},
    ...overrides,
  }
}

type ProposeTaskArchetype = ComponentType<{ state: ProposeTaskState }>

/** Every registered slug, `na` included. The map is synchronous; components are not. */
export const EVERY_SLUG: string[] = Object.keys(surfaceMap('proposeTask'))

/**
 * The archetype for a slug, resolved at CALL time: `preloadArchetypes.ts` warms
 * chunks in `beforeAll`, and a module-scope read would get the deferred wrapper,
 * which renders `null` — so a suite would pass on an empty string.
 */
export function archetypeFor(slug: string): ProposeTaskArchetype {
  const deferred = resolveVariant(surfaceMap('proposeTask'), slug) as ProposeTaskArchetype
  const Archetype = resolvedArchetype(deferred)
  // Only if the chunk never landed (the setup file rules that out).
  if (!Archetype) throw new Error(`no proposeTask archetype resolved for "${slug}"`)
  return Archetype
}
