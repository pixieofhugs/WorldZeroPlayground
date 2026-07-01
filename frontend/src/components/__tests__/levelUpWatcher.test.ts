/**
 * Level-up detection is a pure per-character localStorage diff (#287) — no
 * in-the-moment event exists, since score only rises when others vote. This
 * guards the diff logic directly; no DOM/jsdom is set up in this repo (see
 * vite.config.ts), so localStorage wiring itself is exercised by inspection.
 */
import { describe, it, expect } from 'vitest'
import { diffLevel, lastSeenLevelKey } from '../LevelUpWatcher'

describe('diffLevel', () => {
  it('seeds silently on first observation (no popup, but commits current level)', () => {
    expect(diffLevel(null, 3)).toEqual({ levelsToAnnounce: [], nextStored: 3 })
  })

  it('fires on a single-level increase', () => {
    expect(diffLevel(2, 3)).toEqual({ levelsToAnnounce: [3], nextStored: 3 })
  })

  it('queues every level crossed in order on a multi-level jump', () => {
    expect(diffLevel(2, 5)).toEqual({ levelsToAnnounce: [3, 4, 5], nextStored: 5 })
  })

  it('does nothing on a drop (era reset) and keeps the old high-water mark', () => {
    expect(diffLevel(5, 3)).toEqual({ levelsToAnnounce: [], nextStored: 5 })
  })

  it('does nothing when the level is unchanged', () => {
    expect(diffLevel(3, 3)).toEqual({ levelsToAnnounce: [], nextStored: 3 })
  })
})

describe('lastSeenLevelKey', () => {
  it('namespaces the storage key per character id, so switching characters never mixes state', () => {
    expect(lastSeenLevelKey(1)).not.toBe(lastSeenLevelKey(2))
  })
})
