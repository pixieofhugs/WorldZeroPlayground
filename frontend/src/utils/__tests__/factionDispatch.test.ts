/**
 * pickVariant — the single faction-slug → component resolver (#782).
 *
 * Every surface dispatches through this. Its fall-through behaviour used to be
 * re-proved transitively by ~20 per-faction *Dispatch tests; this pins it once.
 * Which factions are registered on which surface is guarded by
 * factions/__tests__/surfaceDispatch.test.ts; that a manifest routes to every
 * surface at all is guarded generically by factions/__tests__/addAFaction.test.
 */
import { describe, it, expect } from 'vitest'
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

  it('never resolves one faction to another', () => {
    // The alias branch used to sit here, so a slug could reach a sibling
    // faction's variant. Nothing may do that now: an unregistered slug takes
    // the fallback or nothing, never `map`'s other entries.
    expect(pickVariant(map, 'derived', Fallback)).toBe(Fallback)
    expect(pickVariant({ coven: A }, 'derived')).toBeUndefined()
  })
})
