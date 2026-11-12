/**
 * The faction-slug → component resolver (#782, #2530): an unknown slug lands on
 * the `na` row. Per-surface registration is `factions/__tests__/surfaceDispatch`.
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
    // A slug takes its own row or na's, never another entry.
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
    // Real surface maps always have one (defaultManifest.test.tsx).
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
