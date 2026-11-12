/**
 * #1952: the waiting heading ladder. Three outstanding still lists names; the
 * count form starts at FOUR. Each form is asserted by name, to catch the
 * off-by-one. Joining lives in the catalog.
 */
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { collabCopy } from '../collabCopy'
import { waitingOnHeading } from '../waitingHeading'

const SLUG = 'coven'

describe('waitingOnHeading — the ladder (#1952)', () => {
  it('names one holdout', () => {
    expect(waitingOnHeading(SLUG, ['Pixie'])).toBe('Waiting on Pixie')
  })

  it('names two, joined with "and"', () => {
    expect(waitingOnHeading(SLUG, ['Pixie', 'Bob'])).toBe('Waiting on Pixie and Bob')
  })

  it('names THREE — the form the count is routinely collapsed onto', () => {
    expect(waitingOnHeading(SLUG, ['Pixie', 'Bob', 'Ann'])).toBe(
      'Waiting on Pixie, Bob and Ann',
    )
  })

  it('counts at FOUR, and names nobody', () => {
    const four = waitingOnHeading(SLUG, ['Pixie', 'Bob', 'Ann', 'Wren'])
    expect(four).toBe('Waiting on 4')
    expect(four).not.toContain('Pixie')
  })

  it('keeps counting past four', () => {
    expect(waitingOnHeading(SLUG, ['a', 'b', 'c', 'd', 'e'])).toBe('Waiting on 5')
  })

  it('has nothing to say when nobody is outstanding', () => {
    // Unreachable from the surface; the caller falls back.
    expect(waitingOnHeading(SLUG, [])).toBeNull()
  })

  it('reads the same on every faction (#1812)', () => {
    for (const slug of ['na', 'coven', 'snide', 'wow', null]) {
      expect(waitingOnHeading(slug, ['Pixie', 'Bob'])).toBe(
        'Waiting on Pixie and Bob',
      )
    }
  })

  it('takes its words from the catalog, not from this module', () => {
    expect(waitingOnHeading(SLUG, ['Pixie'])).toBe(
      collabCopy(SLUG, 'waitingOnOne', { first: 'Pixie' }),
    )
    expect(waitingOnHeading(SLUG, ['a', 'b', 'c', 'd'])).toBe(
      collabCopy(SLUG, 'waitingOnMany', { outstanding: 4 }),
    )
  })
})
