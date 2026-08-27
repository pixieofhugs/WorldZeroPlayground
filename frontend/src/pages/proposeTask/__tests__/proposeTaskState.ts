/**
 * The propose-task state fixture, and the archetype roster the suites walk.
 *
 * WHY IT IS SHARED (#2538). Every propose-task archetype is a pure function of
 * `ProposeTaskState` — `metataskProposal` and `unaffiliatedOption` both relied
 * on that before there was a dispatch seam at all, and the issue's carry-in is
 * to KEEP that property and parameterise the suites over archetypes rather than
 * rewrite them. Three files needed the same 30-line literal to do it, so it is
 * built once here.
 *
 * `EVERY_ARCHETYPE` is DERIVED from `surfaceMap('proposeTask')`, never listed.
 * The seven-faction fan-out (#2538) lands one archetype per PR, and each one
 * inherits these suites the moment it registers — with nothing to append, and no
 * second roster for those PRs to contend on (`surfaceDispatch.test.ts` owns the
 * one that exists).
 *
 * Not a `.test.ts` file, so vitest does not collect it, and it sits under
 * `__tests__/` so the source scans in `archetypeReachability.test.ts` and
 * `surfaceDispatch.test.ts` skip it the way they skip every other test module.
 */
import type { ComponentType } from 'react'

import { resolvedArchetype } from '../../../factions/lazyArchetype'
import { resolveVariant } from '../../../utils/factionDispatch'
import { surfaceMap } from '../../../factions'
import { UNAFFILIATED_FACTION_SLUG, type ProposeTaskState } from '../useProposeTask'

/**
 * A complete, eligible proposer's state. Defaults to the page's opening
 * position: signed in, past the gate, nothing typed, unaffiliated picked.
 */
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

/**
 * Every registered slug, `na` included — the roster `it.each` walks.
 *
 * Read at module scope, which is safe: the MAP is built synchronously. What is
 * not available yet is the component behind each row, so that is
 * {@link archetypeFor}'s job.
 */
export const EVERY_SLUG: string[] = Object.keys(surfaceMap('proposeTask'))

/**
 * The archetype a slug resolves to, unwrapped.
 *
 * Resolved at CALL time, never at module scope: archetypes are code-split, and
 * `src/test/preloadArchetypes.ts` warms them in `beforeAll` — after this module
 * has evaluated. A module-scope read gets the deferred wrapper, which renders
 * `null` under `renderToStaticMarkup`, so a suite would assert against an empty
 * string and pass.
 */
export function archetypeFor(slug: string): ProposeTaskArchetype {
  const deferred = resolveVariant(surfaceMap('proposeTask'), slug) as ProposeTaskArchetype
  const Archetype = resolvedArchetype(deferred)
  // Only undefined if the chunk never landed, which the setup file rules out —
  // throwing says that, where rendering `undefined` would not.
  if (!Archetype) throw new Error(`no proposeTask archetype resolved for "${slug}"`)
  return Archetype
}
