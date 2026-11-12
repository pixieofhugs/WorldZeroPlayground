/** Invitation detection is a pure per-character localStorage diff (#243). */
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
    // The last-seen set must not shrink, or a stale slug could retro-fire.
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
