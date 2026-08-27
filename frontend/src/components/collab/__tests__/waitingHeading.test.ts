/**
 * #1952 — the heading that answers "am I done?", and names who is blocking.
 *
 * THE SEAM. One pure formatter turns the outstanding names into the one
 * sentence the waiting surface leads with. The four forms are the owner's
 * ladder, and the boundary between them is the whole reason this is tested
 * here rather than only through the rendered surface: the ruling is "waiting on
 * X when X is greater than 3", so THREE outstanding still lists all three names
 * and the count form starts at FOUR. Each form is named and asserted below —
 * a count of forms would pass on the off-by-one this guards.
 *
 * The joining lives in the catalog, not here: the comma, the "and", and the
 * Oxford-comma question are four written strings, and this only chooses which.
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
    // Unreachable from the surface — the gate is `waiting` only while somebody
    // still owes an approval — so the caller falls back rather than printing a
    // sentence with a hole in it.
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
