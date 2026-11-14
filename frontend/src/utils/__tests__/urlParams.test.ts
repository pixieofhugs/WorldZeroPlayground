import { describe, it, expect } from 'vitest'
import { readOneOf } from '../urlParams'

const ALLOWED = ['new', 'top'] as const

describe('readOneOf', () => {
  it('passes an allowed value through', () => {
    expect(readOneOf('top', ALLOWED, 'new')).toBe('top')
  })
  it('falls back for absent, blank and unknown values (a stale bookmark must not 422 the list)', () => {
    expect(readOneOf(null, ALLOWED, 'new')).toBe('new')
    expect(readOneOf('', ALLOWED, 'new')).toBe('new')
    expect(readOneOf('hot', ALLOWED, 'new')).toBe('new')
  })
  it('is case-sensitive', () => {
    expect(readOneOf('TOP', ALLOWED, 'new')).toBe('new')
  })
})
