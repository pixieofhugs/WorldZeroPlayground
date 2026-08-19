/**
 * #1416 — the roster's row model.
 *
 * The seam under test is the PURE half: which of the four states a given
 * (member, invite) pair selects, and the monogram derivation. The harness is
 * `renderToStaticMarkup` only — effects never run and a click cannot be
 * simulated — so everything worth asserting about behaviour has to be a
 * function, and this is it.
 */
import { describe, it, expect } from 'vitest'
import type { PraxisInviteOut, PraxisMemberOut } from '../../../api/praxis'
import { buildRosterRows, isRowDone, rosterInitials } from '../rosterRows'

function member(id: number, submitted: boolean): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    character_avatar_url: '',
    has_submitted: submitted,
    is_done: false,
    joined_at: '2026-01-01T00:00:00Z',
    nudged_at: null,
    submitted_at: null,
  }
}

function invite(
  id: number,
  inviteeId: number,
  status: PraxisInviteOut['status'],
  createdAt = '2026-01-01T00:00:00Z',
): PraxisInviteOut {
  return {
    id,
    praxis_id: 1,
    inviter_id: 1,
    invitee_id: inviteeId,
    invitee_display_name: `I${inviteeId}`,
    invitee_avatar_url: '',
    status,
    created_at: createdAt,
  }
}

describe('buildRosterRows — the four states', () => {
  it('a submitted member is filed', () => {
    expect(buildRosterRows([member(1, true)], [])[0]).toMatchObject({
      state: 'filed',
      name: 'M1',
    })
  })

  it('a member who has not submitted is accepted', () => {
    expect(buildRosterRows([member(1, false)], [])[0].state).toBe('accepted')
  })

  it('a pending invite is invited', () => {
    const rows = buildRosterRows([], [invite(9, 20, 'pending')])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ state: 'invited', name: 'I20' })
  })

  // The state that did not exist before: a declined invite used to be filtered
  // away everywhere it appeared, so a refusal read exactly like never asking.
  it('a declined invite is declined, not dropped', () => {
    const rows = buildRosterRows([], [invite(9, 20, 'declined')])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ state: 'declined', name: 'I20' })
  })

  it('only filed counts as done', () => {
    expect(isRowDone('filed')).toBe(true)
    expect(isRowDone('accepted')).toBe(false)
    expect(isRowDone('invited')).toBe(false)
    expect(isRowDone('declined')).toBe(false)
  })
})

describe('buildRosterRows — merging the two arrays', () => {
  it('lists members first, then whoever has been asked', () => {
    const rows = buildRosterRows(
      [member(1, true), member(2, false)],
      [invite(9, 30, 'pending'), invite(10, 31, 'declined')],
    )
    expect(rows.map((row) => row.state)).toEqual([
      'filed',
      'accepted',
      'invited',
      'declined',
    ])
  })

  // Accepting an invite does not delete it, so every member invited into a
  // collab still has an `accepted` invite on the wire. Drawing it would list
  // them twice — once as a member and once as a ghost.
  it('drops an invite whose invitee is already a member', () => {
    const rows = buildRosterRows(
      [member(7, false)],
      [invite(9, 7, 'pending'), invite(10, 7, 'declined')],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].state).toBe('accepted')
  })

  it('ignores an accepted invite even when the member row is missing', () => {
    expect(buildRosterRows([], [invite(9, 30, 'accepted')])).toHaveLength(0)
  })

  // B1 §4: a character can hold a declined invite AND a later pending one.
  it('newest wins — a re-invited player reads as invited', () => {
    const rows = buildRosterRows(
      [],
      [
        invite(9, 30, 'declined', '2026-01-01T00:00:00Z'),
        invite(12, 30, 'pending', '2026-02-01T00:00:00Z'),
      ],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].state).toBe('invited')
  })

  it('newest wins whichever order the server sent them in', () => {
    const rows = buildRosterRows(
      [],
      [
        invite(12, 30, 'pending', '2026-02-01T00:00:00Z'),
        invite(9, 30, 'declined', '2026-01-01T00:00:00Z'),
      ],
    )
    expect(rows.map((row) => row.state)).toEqual(['invited'])
  })

  // Two invites issued in the same second are indistinguishable by timestamp,
  // so the monotonic id breaks the tie.
  it('breaks a timestamp tie on the invite id', () => {
    const rows = buildRosterRows(
      [],
      [
        invite(12, 30, 'pending', '2026-02-01T00:00:00Z'),
        invite(13, 30, 'declined', '2026-02-01T00:00:00Z'),
      ],
    )
    expect(rows.map((row) => row.state)).toEqual(['declined'])
  })

  // The read-only praxis-detail mount for a NON-member: the backend serialises
  // invites to members only, so the array is legitimately empty rather than
  // merely absent. Invite rows must degrade to nothing, not to an empty row.
  it('degrades to members alone when invites are absent', () => {
    expect(buildRosterRows([member(1, false)], undefined)).toHaveLength(1)
  })

  it('renders no rows at all for an empty praxis', () => {
    expect(buildRosterRows([], undefined)).toEqual([])
  })

  it('gives members and invites non-colliding keys at the same id', () => {
    const rows = buildRosterRows([member(1, false)], [invite(1, 30, 'pending')])
    expect(new Set(rows.map((row) => row.key)).size).toBe(2)
  })
})

describe('rosterInitials', () => {
  it('takes the first and last word of a full name', () => {
    expect(rosterInitials('Molly Sanderson')).toBe('MS')
  })

  it('skips the middle names', () => {
    expect(rosterInitials('ada byron king lovelace')).toBe('AL')
  })

  it('gives a one-word name its first two letters', () => {
    expect(rosterInitials('Molly')).toBe('MO')
  })

  it('survives a one-letter name', () => {
    expect(rosterInitials('M')).toBe('M')
  })

  // Display names are free text, so punctuation must not become a monogram.
  it('strips punctuation rather than initialling it', () => {
    expect(rosterInitials('J.R. Tolkien')).toBe('JT')
    expect(rosterInitials('  ~molly~  ')).toBe('MO')
    expect(rosterInitials("O'Neill")).toBe('ON')
  })

  it('keeps non-ASCII letters', () => {
    expect(rosterInitials('Émile Zola')).toBe('ÉZ')
  })

  it('falls back to ? for an empty or missing name', () => {
    expect(rosterInitials('')).toBe('?')
    expect(rosterInitials('   ')).toBe('?')
    expect(rosterInitials('!!!')).toBe('?')
    expect(rosterInitials(null)).toBe('?')
    expect(rosterInitials(undefined)).toBe('?')
  })
})
