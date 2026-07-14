/**
 * Invitation detection is a pure per-character localStorage diff (#243) —
 * invitations are earned from the same vote-driven scoring signal as level-ups,
 * so there's no in-the-moment event. This guards the diff logic directly; no
 * DOM/jsdom is set up in this repo (see vite.config.ts), so the localStorage
 * wiring itself is exercised by inspection (mirrors levelUpWatcher.test.ts).
 */
import { describe, it, expect } from 'vitest'
import { diffInvites, seenInvitesKey } from '../InvitationWatcher'

describe('diffInvites', () => {
  it('seeds silently on first observation (no popup, but commits current set)', () => {
    expect(diffInvites(null, ['ua', 'wow'])).toEqual({
      toAnnounce: [],
      nextStored: ['ua', 'wow'],
    })
  })

  it('seeds silently to an empty set when there are no invites yet', () => {
    expect(diffInvites(null, [])).toEqual({ toAnnounce: [], nextStored: [] })
  })

  it('announces a single newly-earned invitation', () => {
    expect(diffInvites(['ua'], ['ua', 'wow'])).toEqual({
      toAnnounce: ['wow'],
      nextStored: ['ua', 'wow'],
    })
  })

  it('announces every newly-earned slug in sorted order', () => {
    expect(diffInvites([], ['wow', 'snide'])).toEqual({
      toAnnounce: ['snide', 'wow'],
      nextStored: ['snide', 'wow'],
    })
  })

  it('never re-announces an already-seen invitation', () => {
    expect(diffInvites(['ua', 'wow'], ['ua', 'wow'])).toEqual({
      toAnnounce: [],
      nextStored: ['ua', 'wow'],
    })
  })

  it('keeps a seen slug in the stored set even if the current set drops it (era reset)', () => {
    // The source empties on era reset; the last-seen set must not shrink, so a
    // stale slug never retro-fires. Genuinely-new next-era earns re-announce via
    // seed-silent + a fresh union.
    expect(diffInvites(['ua', 'wow'], [])).toEqual({
      toAnnounce: [],
      nextStored: ['ua', 'wow'],
    })
  })

  it('deduplicates a repeated current slug', () => {
    expect(diffInvites([], ['ua', 'ua'])).toEqual({
      toAnnounce: ['ua'],
      nextStored: ['ua'],
    })
  })
})

describe('seenInvitesKey', () => {
  it('namespaces the storage key per character id, so switching lives never mixes state', () => {
    expect(seenInvitesKey(1)).not.toBe(seenInvitesKey(2))
  })
})
