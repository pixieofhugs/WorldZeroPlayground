/**
 * The Albescent invitation's life chooser (#395) only offers active,
 * non-Albescent lives — paused/banned lives can't be carried, and a life
 * already of the Order has nothing left to accept. Pure filter, tested
 * directly (no jsdom in this repo — see vite.config.ts).
 */
import { describe, it, expect } from 'vitest'
import { eligibleLives } from '../AlbescentInvitation'
import type { CharacterOut } from '../../api/auth'

function life(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wanderer',
    display_name: 'Wanderer',
    bio: null,
    avatar_url: null,
    location: null,
    level: 8,
    score: 0,
    all_time_score: 0,
    faction_slug: 'ua',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('eligibleLives', () => {
  it('keeps active, non-Albescent lives', () => {
    const lives = [life({ id: 1, faction_slug: 'ua' }), life({ id: 2, faction_slug: 'wow' })]
    expect(eligibleLives(lives).map((l) => l.id)).toEqual([1, 2])
  })

  it('drops paused lives — the roster includes them, the order will not', () => {
    const lives = [life({ id: 1, status: 'paused' }), life({ id: 2 })]
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
