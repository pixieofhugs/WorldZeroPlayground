/**
 * pickVariant — the single faction-slug → component resolver (#782).
 *
 * Every surface dispatches through this. Its fall-through behaviour used to be
 * re-proved transitively by ~20 per-faction *Dispatch tests; this pins it once.
 * Which factions are registered on which surface is guarded by
 * factions/__tests__/surfaceDispatch.test.ts; that a manifest routes to every
 * surface at all is guarded generically by factions/__tests__/addAFaction.test.
 */
import { describe, it, expect, vi } from 'vitest'
import { pickVariant } from '../factionDispatch'

const A = () => null
const B = () => null
const Fallback = () => null
const map = { coven: A, ua: B }

describe('pickVariant', () => {
  it('returns the registered component for a known slug', () => {
    expect(pickVariant(map, 'coven', Fallback)).toBe(A)
    expect(pickVariant(map, 'ua', Fallback)).toBe(B)
  })

  it('falls back for an unregistered slug', () => {
    expect(pickVariant(map, '__nope__', Fallback)).toBe(Fallback)
  })

  it('falls back for null / undefined / empty slug', () => {
    expect(pickVariant(map, null, Fallback)).toBe(Fallback)
    expect(pickVariant(map, undefined, Fallback)).toBe(Fallback)
    expect(pickVariant(map, '', Fallback)).toBe(Fallback)
  })

  it('without a fallback, returns undefined when nothing matches', () => {
    expect(pickVariant(map, '__nope__')).toBeUndefined()
    expect(pickVariant(map, null)).toBeUndefined()
  })
})

// The alias branch: a derived slug inherits its canonical faction's variant.
// FACTION_ALIASES is empty in production, so this is the only thing that
// exercises the branch at all.
describe('pickVariant alias resolution', () => {
  it('resolves a slug through its alias to the canonical entry', async () => {
    // resetModules so the dynamic import re-evaluates factionDispatch against
    // the mocked FACTION_ALIASES instead of the already-cached real (empty) one.
    vi.resetModules()
    vi.doMock('../factions', () => ({ FACTION_ALIASES: { derived: 'coven' } }))
    const { pickVariant: withAlias } = await import('../factionDispatch')
    expect(withAlias(map, 'derived', Fallback)).toBe(A) // derived → coven → A
    expect(withAlias({ coven: A }, 'derived')).toBe(A) // even with no fallback
    vi.doUnmock('../factions')
    vi.resetModules()
  })
})
