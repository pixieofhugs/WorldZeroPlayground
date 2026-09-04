/**
 * The phone reader's open-panel ruling (#1084), and the whole of its tail.
 *
 * Every row of the table in `openSide.ts` gets a case here, because the tail is
 * where a re-reading goes wrong: "whoever is behind" is a one-line ruling with
 * four situations in which nobody is behind, and a build that implements only
 * the head silently opens the challenger on every resolved duel.
 */
import { describe, it, expect } from 'vitest'
import { openSideFor, type DuelSideKey } from '../openSide'
import type { DuelDetailOut, DuelSideOut } from '../../../api/duel'

function side(overrides: Partial<DuelSideOut> = {}): DuelSideOut {
  return {
    avatar_url: '',
    character_id: 1,
    display_name: 'Wren Ashgrove',
    faction_slug: 'na',
    is_submitted: true,
    nudged_at: null,
    points_from_votes: 0,
    praxis_id: 601,
    ...overrides,
  }
}

function duel(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 44,
    task_id: 101,
    status: 'settled',
    forfeited_by_character_id: null,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    challenger: side({ character_id: 7, points_from_votes: 18.4 }),
    opponent: side({
      character_id: 19,
      display_name: 'Otho Bell',
      faction_slug: 'snide',
      praxis_id: 602,
      points_from_votes: 15.8,
    }),
    ...overrides,
  }
}

describe('a live standing opens the side that is BEHIND', () => {
  it('opens the opponent when the challenger leads', () => {
    expect(openSideFor(duel(), 'challenger')).toBe('opponent')
  })

  it('opens the challenger when the opponent leads', () => {
    const d = duel({
      challenger: side({ character_id: 7, points_from_votes: 12.1 }),
      opponent: side({ character_id: 19, points_from_votes: 20.9 }),
    })
    expect(openSideFor(d, 'challenger')).toBe('challenger')
  })

  it('ignores where you arrived from — the standing decides, not the route', () => {
    // The one assertion that separates this ruling from the drawn default.
    // Arriving from the LEADER still opens the trailer.
    expect(openSideFor(duel(), 'challenger')).toBe('opponent')
    expect(openSideFor(duel(), 'opponent')).toBe('opponent')
  })
})

describe('where nobody is behind, the arrived-from side opens', () => {
  it('an exact tie falls back', () => {
    const tied = duel({
      challenger: side({ character_id: 7, points_from_votes: 17 }),
      opponent: side({ character_id: 19, points_from_votes: 17 }),
    })
    expect(openSideFor(tied, 'opponent')).toBe('opponent')
    expect(openSideFor(tied, 'challenger')).toBe('challenger')
  })

  it('a resolved duel falls back rather than opening the loser', () => {
    // The era has closed and there is nothing left to cast, so the
    // anti-bandwagon reason no longer applies. The challenger is BEHIND here
    // and still does not open.
    const done = duel({
      status: 'resolved',
      winner_character_id: 19,
      challenger_final_points: 15.8,
      opponent_final_points: 18.4,
      challenger: side({ character_id: 7, points_from_votes: 15.8 }),
      opponent: side({ character_id: 19, points_from_votes: 18.4 }),
    })
    expect(openSideFor(done, 'opponent')).toBe('opponent')
  })

  it('a forfeit falls back even though the figures still differ', () => {
    // Checked BEFORE the standing: a forfeited side keeps a points figure that
    // the surface draws as an em-dash, so "behind" stops meaning anything.
    const forfeited = duel({ forfeited_by_character_id: 7 })
    expect(openSideFor(forfeited, 'opponent')).toBe('opponent')
    expect(openSideFor(forfeited, 'challenger')).toBe('challenger')
  })

  it('a no-contest falls back', () => {
    const noContest = duel({
      status: 'resolved',
      winner_character_id: null,
      challenger_final_points: null,
      opponent_final_points: null,
    })
    expect(openSideFor(noContest, 'challenger')).toBe('challenger')
  })
})

describe('a deep link with no arrived-from side opens the challenger', () => {
  it('falls back to the challenger when the standing cannot decide', () => {
    const tied = duel({
      challenger: side({ character_id: 7, points_from_votes: 17 }),
      opponent: side({ character_id: 19, points_from_votes: 17 }),
    })
    expect(openSideFor(tied, null)).toBe('challenger')
  })

  it('still honours the ruling when there IS a standing', () => {
    // The deep-link fallback is the tail only. A live standing outranks it.
    expect(openSideFor(duel(), null)).toBe('opponent')
  })
})

describe('the function is total over both keys', () => {
  it('always returns one of the two side names', () => {
    const keys: readonly (DuelSideKey | null)[] = ['challenger', 'opponent', null]
    for (const from of keys) {
      for (const status of ['settled', 'resolved'] as const) {
        const got = openSideFor(duel({ status }), from)
        expect(['challenger', 'opponent']).toContain(got)
      }
    }
  })
})
