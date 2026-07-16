/**
 * rosterNames (#573/#587) — the shared crew-name cap helper. Returns every
 * display name up to the cap plus the overflow count of the "+N more" tail.
 */
import { describe, it, expect } from 'vitest'
import { rosterNames, ROSTER_NAME_CAP } from '../shared'

const makeMembers = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ display_name: `Player ${index + 1}` }))

describe('rosterNames', () => {
  it('returns every name and zero overflow at or below the cap', () => {
    const members = makeMembers(3)
    const { names, overflow } = rosterNames(members)
    expect(names).toEqual(['Player 1', 'Player 2', 'Player 3'])
    expect(overflow).toBe(0)
  })

  it('returns exactly the cap of names at the boundary', () => {
    const { names, overflow } = rosterNames(makeMembers(ROSTER_NAME_CAP))
    expect(names).toHaveLength(ROSTER_NAME_CAP)
    expect(overflow).toBe(0)
  })

  it('caps names and counts the overflow above the cap', () => {
    const { names, overflow } = rosterNames(makeMembers(ROSTER_NAME_CAP + 4))
    expect(names).toHaveLength(ROSTER_NAME_CAP)
    expect(overflow).toBe(4)
  })

  it('honours an explicit lower cap', () => {
    const { names, overflow } = rosterNames(makeMembers(5), 2)
    expect(names).toEqual(['Player 1', 'Player 2'])
    expect(overflow).toBe(3)
  })

  it('coerces missing display names to empty strings', () => {
    const { names } = rosterNames([{ display_name: null }, {}])
    expect(names).toEqual(['', ''])
  })
})
