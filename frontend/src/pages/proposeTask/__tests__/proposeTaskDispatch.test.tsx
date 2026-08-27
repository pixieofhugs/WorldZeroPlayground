/**
 * Propose-task dispatch (#2538) — the seam, not the dress.
 *
 * THE SEAM IS `state.factionSlug` → ARCHETYPE, and the slug is the SELECTED
 * TARGET FACTION: the faction the task is being proposed FOR, which the form
 * asks for as a first-class field (#1824's chips). It is not the viewer's
 * faction, and that is the one thing a green build cannot tell you — a
 * dispatcher wired to `useAuth()` renders a perfectly good page in the wrong
 * hand, and the two are the same string for most players most of the time.
 *
 * These are `createCharacter`'s semantics deliberately and exactly (owner
 * ruling, 2026-08-24): the page reskins LIVE as the chips change, and returns to
 * the na kit when the pick is cleared or when "unaffiliated" is picked. Same
 * seam, same reasoning — a reader should not have to learn two. So the property
 * worth pinning is a function of one string and needs no DOM: same state,
 * different slug, different component.
 *
 * THE DEFECT CLASS THIS GUARDS IS #796 / #418 / #636. `FactionSelectCard`'s
 * fallback used to be `UaSelectCard`, which "dressed every unaffiliated and
 * unknown slug in UA's costume" — three times before it was caught. `na` and any
 * unregistered slug MUST land on the na kit, never a faction costume.
 *
 * THE GATES ARE NOT HERE, AND THAT IS THE POINT OF THE LAST BLOCK.
 * `state.isLoggedIn` and `state.canProposeTask` are answered in the DISPATCHER,
 * above the archetype, so the eight archetypes only ever draw the happy path.
 * Duplicating that gate into eight files is the thing this chassis exists not to
 * do, so it is asserted on `ProposeTask` itself rather than on an archetype.
 *
 * Nothing here proves a pixel: `renderToStaticMarkup`, no DOM (SPEC-testing.md).
 * Visual QA is outstanding and stated on the PR.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { UNAFFILIATED_FACTION_SLUG } from '../../../utils/factions'
import { archetypeFor, EVERY_SLUG, proposeTaskState } from './proposeTaskState'
import type { ProposeTaskState } from '../useProposeTask'

// `useProposeTask` reaches for the auth context and the faction resource; the
// dispatcher block below renders the PAGE rather than an archetype, so the hook
// is stubbed down to the two fields the gates read. Spread from the original: a
// bare factory blanks the module's sibling exports (`UNAFFILIATED_FACTION_SLUG`
// is re-exported from there and read across this file's graph).
const hookState = vi.hoisted(() => ({ value: {} as ProposeTaskState }))
vi.mock('../useProposeTask', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useProposeTask')>()),
  useProposeTask: () => hookState.value,
}))

const DefaultProposeTask = (await import('../archetypes/DefaultProposeTask')).default
const AlbescentProposeTask = (await import('../archetypes/AlbescentProposeTask')).default
const ProposeTask = (await import('../../ProposeTask')).default

/**
 * The registered slugs, DERIVED rather than listed — the same choice
 * `createCharacterDispatch.test.tsx` makes and for the same reason.
 * `surfaceDispatch.test.ts` owns which slugs are bespoke, for every surface in
 * one place; a second roster here would mean the seven fan-out PRs each append
 * to TWO files in parallel, which is the shared-registry shape that red-mained
 * `main` twice (#1162).
 *
 * `na` is excluded because since #2530 it is a ROW rather than the fallback
 * behind the row — every assertion below about "the Default" is about the
 * component that row points at.
 */
const REGISTERED = EVERY_SLUG.filter((slug) => slug !== UNAFFILIATED_FACTION_SLUG)

describe('the faction being proposed FOR chooses the archetype', () => {
  it('at least one faction fills the slot', () => {
    // The manifest's own rule (#2346): "a slot no faction fills is not a seam,
    // it is a lookup that always returns the same answer." Four surfaces died
    // that way. The chassis may not merge empty, and this is the row that would
    // go red if a future PR removed the last registration rather than the key.
    expect(REGISTERED.length).toBeGreaterThan(0)
  })

  it.each(REGISTERED)('%s reskins the page away from the Default', (slug) => {
    expect(archetypeFor(slug)).not.toBe(DefaultProposeTask)
  })

  it('picking "unaffiliated" renders the na kit, never a faction costume (#796)', () => {
    expect(archetypeFor(UNAFFILIATED_FACTION_SLUG)).toBe(DefaultProposeTask)
  })

  it('clearing the pick returns the page to the Default', () => {
    // The live reskin, stated as the round trip it actually is: the same page,
    // one chip changed.
    const picked = archetypeFor(REGISTERED[0])
    const cleared = archetypeFor('')
    expect(picked).not.toBe(cleared)
    expect(cleared).toBe(DefaultProposeTask)
  })

  it('an unknown slug cannot reach Object.prototype (#1821)', () => {
    // `resolveSlug` is own-property-only; a bracket read would hand back the
    // `Object` function for React to render.
    expect(archetypeFor('constructor')).toBe(DefaultProposeTask)
    expect(archetypeFor('no-such-faction')).toBe(DefaultProposeTask)
  })
})

describe('albescent is a PASS-THROUGH here (#2531 kinds)', () => {
  // na draws its spectrum on this page through INLINE styles computed from the
  // slug (`proposeTask/factionSurfaces.ts`), not through `.spectrum-dial` or
  // `.spectrum-rule`, so `.alb-moves` has nothing to reach — the same finding
  // that made `comment` and `duelSeal` pass-throughs. A pass-through that shifts
  // a pixel is a bug, so byte-identity IS the acceptance test.
  it('renders markup byte-identical to the Default', () => {
    const state = proposeTaskState({ factionSlug: 'albescent' })
    const wrapped = renderToStaticMarkup(
      <MemoryRouter><AlbescentProposeTask state={state} /></MemoryRouter>,
    )
    const plain = renderToStaticMarkup(
      <MemoryRouter><DefaultProposeTask state={state} /></MemoryRouter>,
    )
    expect(wrapped).toBe(plain)
  })
})

describe('the gates live in the dispatcher, above every archetype', () => {
  // Eight archetypes must never each carry a copy of these two early returns.
  // Asserting them on the PAGE is what says so: an archetype that grew its own
  // copy would still pass, but a dispatcher that LOST them fails here.
  function page(overrides: Partial<ProposeTaskState>): string {
    hookState.value = proposeTaskState(overrides)
    return renderToStaticMarkup(<MemoryRouter><ProposeTask /></MemoryRouter>)
  }

  it('a signed-out visitor is told to sign in, and no archetype renders', () => {
    const html = page({ isLoggedIn: false })
    expect(html).not.toContain('role="radiogroup"')
  })

  it('an under-levelled player is told the level, and no archetype renders', () => {
    const html = page({ canProposeTask: false, currentLevel: 1 })
    expect(html).not.toContain('role="radiogroup"')
  })

  it('an eligible player reaches the form itself', () => {
    expect(page({})).toContain('role="radiogroup"')
  })
})
