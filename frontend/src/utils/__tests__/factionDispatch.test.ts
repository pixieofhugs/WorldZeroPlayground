/**
 * The faction-slug → component resolver (#782, #2530).
 *
 * Every surface dispatches through this. Its fall-through behaviour used to be
 * re-proved transitively by ~20 per-faction *Dispatch tests; this pins it once.
 * Which factions are registered on which surface is guarded by
 * factions/__tests__/surfaceDispatch.test.ts; that a manifest routes to every
 * surface at all is guarded generically by factions/__tests__/addAFaction.test.
 *
 * THE FALLBACK ARGUMENT IS GONE (#2530), so the unknown-slug rule is asserted
 * here as "lands on the `na` ROW" rather than as "takes whatever component the
 * caller passed third". That is the whole substance of the issue: there is one
 * mechanism now, and `na` is a faction in the registry rather than an argument
 * repeated at ~20 call sites.
 */
import { describe, it, expect } from 'vitest'
import { pickVariant, resolveSlug, resolveVariant } from '../factionDispatch'

const A = () => null
const B = () => null
const Na = () => null
const map = { coven: A, ua: B, na: Na }

describe('resolveVariant', () => {
  it('returns the registered component for a known slug', () => {
    expect(resolveVariant(map, 'coven')).toBe(A)
    expect(resolveVariant(map, 'ua')).toBe(B)
  })

  it('lands an unregistered slug on the na row', () => {
    expect(resolveVariant(map, '__nope__')).toBe(Na)
  })

  it('lands a null / undefined / empty slug on the na row', () => {
    expect(resolveVariant(map, null)).toBe(Na)
    expect(resolveVariant(map, undefined)).toBe(Na)
    expect(resolveVariant(map, '')).toBe(Na)
  })

  it('never resolves one faction to another', () => {
    // The alias branch used to sit here, so a slug could reach a sibling
    // faction's variant. Nothing may do that now: a slug takes its own row or
    // na's, never `map`'s other entries.
    expect(resolveVariant(map, 'derived')).toBe(Na)
  })
})

describe('resolveSlug', () => {
  it('is the whole unknown-slug rule, in one place', () => {
    expect(resolveSlug(map, 'coven')).toBe('coven')
    expect(resolveSlug(map, '__nope__')).toBe('na')
    expect(resolveSlug(map, null)).toBe('na')
    expect(resolveSlug(map, '')).toBe('na')
  })

  it('answers na even when the map has no na row, so the caller cannot be misled', () => {
    // A surface map ALWAYS has one (defaultManifest.test.tsx), so this is about
    // the ad-hoc maps in tests: the rule is stated once and does not silently
    // become "the first key that happens to exist".
    expect(resolveSlug({ coven: A }, '__nope__')).toBe('na')
  })
})

describe('pickVariant', () => {
  it('answers the other question: is there a BESPOKE variant for this slug', () => {
    expect(pickVariant(map, 'coven')).toBe(A)
    expect(pickVariant(map, '__nope__')).toBeUndefined()
    expect(pickVariant(map, null)).toBeUndefined()
    expect(pickVariant({ coven: A }, 'derived')).toBeUndefined()
  })
})
