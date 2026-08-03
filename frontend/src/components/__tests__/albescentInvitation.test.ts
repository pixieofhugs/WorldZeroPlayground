/**
 * The Albescent invitation's life chooser (#395) only offers active,
 * non-Albescent lives — a banned life can't be carried, and a life already of
 * the Order has nothing left to accept. Pure filter, tested directly (no jsdom
 * in this repo — see vite.config.ts).
 */
import { describe, it, expect } from 'vitest'
import { eligibleLives } from '../AlbescentInvitation'
import type { CharacterOut } from '../../api/auth'

function life(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wanderer',
    display_name: 'Wanderer',
    bio: '',
    avatar_url: '',
    location: '',
    level: 8,
    score: 0,
    all_time_score: 0,
    faction_slug: 'ua',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

describe('eligibleLives', () => {
  it('keeps active, non-Albescent lives', () => {
    const lives = [life({ id: 1, faction_slug: 'ua' }), life({ id: 2, faction_slug: 'wow' })]
    expect(eligibleLives(lives).map((l) => l.id)).toEqual([1, 2])
  })

  // Was written against `paused`, the one status the roster carried and the
  // order refused. That value is gone (#1550), so the mixed-list case — one
  // life dropped, its sibling kept — is asserted on the surviving non-active
  // status instead of deleted with it.
  it('drops a non-active life while keeping its sibling', () => {
    const lives = [life({ id: 1, status: 'banned' }), life({ id: 2 })]
    expect(eligibleLives(lives).map((l) => l.id)).toEqual([2])
  })

  it('drops lives already of the Order', () => {
    const lives = [life({ id: 1, faction_slug: 'albescent' }), life({ id: 2, faction_slug: 'na' })]
    expect(eligibleLives(lives).map((l) => l.id)).toEqual([2])
  })

  it('returns empty when nobody is fit to answer', () => {
    expect(eligibleLives([life({ status: 'banned' })])).toEqual([])
  })
})
