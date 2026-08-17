/**
 * The body editor's one gate (#1742, #1931 → #1811).
 *
 * This file used to prove #1745's freeze: a 4001 close latched, the fetched
 * status backed it up, and the editor refused a keystroke either way. ADR-0079
 * retired the state all of that served — `pending` means "a proposal is live",
 * the room takes writes in every status a member can reach, and what keeps a
 * countdown from being cancelled by accident is one confirmation
 * (`proposalGuard.test.ts`), not a lock.
 *
 * What is left is the refusal that was never about consensus: the document has
 * not arrived, or the praxis is moderated. Both are still refusals a member can
 * hit, and neither may be mistaken for permission.
 */
import { describe, it, expect } from 'vitest'
import { composerWritable } from '../roomSeal'

describe('composerWritable', () => {
  it('takes text from a seeded room on an unlocked praxis', () => {
    expect(composerWritable(true, false)).toBe(true)
  })

  it('refuses until the document has arrived, locked or not', () => {
    // "Not yet" — typing in front of the server's seed merges into text the
    // player has never seen (ADR-0073 rule 1).
    expect(composerWritable(false, false)).toBe(false)
    expect(composerWritable(false, true)).toBe(false)
  })

  it('refuses a moderated praxis, which is the one composer still drawn locked', () => {
    // "Not here" — `controlsLocked`. Since #1164 a published praxis hands off to
    // the read page, so hidden/failed is what is left.
    expect(composerWritable(true, true)).toBe(false)
  })
})
