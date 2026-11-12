/**
 * Propose-task dispatch (#2538): `state.factionSlug` → archetype, where the slug
 * is the TARGET faction the task is proposed FOR, not the viewer's (a
 * `useAuth()`-wired dispatcher looks right for most players). Same live-reskin
 * semantics as `createCharacter` (owner ruling).
 *
 * Guards #796: `na` and unregistered slugs must land on the na kit, never a
 * faction costume. The login/level gates live in the dispatcher, so they are
 * asserted on `ProposeTask`, not an archetype. Static markup, no DOM.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { UNAFFILIATED_FACTION_SLUG } from '../../../utils/factions'
import { archetypeFor, EVERY_SLUG, proposeTaskState } from './proposeTaskState'
import type { ProposeTaskState } from '../useProposeTask'

// The dispatcher block renders the PAGE, so the hook is stubbed to what the gates
// read. Spread the original: a bare factory blanks sibling exports.
const hookState = vi.hoisted(() => ({ value: {} as ProposeTaskState }))
vi.mock('../useProposeTask', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useProposeTask')>()),
  useProposeTask: () => hookState.value,
}))

const DefaultProposeTask = (await import('../archetypes/DefaultProposeTask')).default
const AlbescentProposeTask = (await import('../archetypes/AlbescentProposeTask')).default
const ProposeTask = (await import('../../ProposeTask')).default

/**
 * Derived, not listed: `surfaceDispatch.test.ts` owns the roster (#1162). `na`
 * is a ROW since #2530, so it is excluded here.
 */
const REGISTERED = EVERY_SLUG.filter((slug) => slug !== UNAFFILIATED_FACTION_SLUG)

describe('the faction being proposed FOR chooses the archetype', () => {
  it('at least one faction fills the slot', () => {
    // #2346: a slot no faction fills is a lookup, not a seam.
    expect(REGISTERED.length).toBeGreaterThan(0)
  })

  it.each(REGISTERED)('%s reskins the page away from the Default', (slug) => {
    expect(archetypeFor(slug)).not.toBe(DefaultProposeTask)
  })

  it('picking "unaffiliated" renders the na kit, never a faction costume (#796)', () => {
    expect(archetypeFor(UNAFFILIATED_FACTION_SLUG)).toBe(DefaultProposeTask)
  })

  it('clearing the pick returns the page to the Default', () => {
    const picked = archetypeFor(REGISTERED[0])
    const cleared = archetypeFor('')
    expect(picked).not.toBe(cleared)
    expect(cleared).toBe(DefaultProposeTask)
  })

  it('an unknown slug cannot reach Object.prototype (#1821)', () => {
    // `resolveSlug` is own-property-only; a bracket read would return `Object`.
    expect(archetypeFor('constructor')).toBe(DefaultProposeTask)
    expect(archetypeFor('no-such-faction')).toBe(DefaultProposeTask)
  })
})

describe('albescent is a PASS-THROUGH here (#2531 kinds)', () => {
  // na's spectrum is the sheet's own frame here, so `.alb-moves` has nothing to
  // reach; kept a pass-through by decision (#2993). Byte-identity is the test.
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
  // A dispatcher that LOST the early returns fails here.
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
