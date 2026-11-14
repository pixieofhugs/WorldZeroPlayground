/**
 * The Albescent life chooser (#395, #2399). `eligibleLives` and `barredLives`
 * must PARTITION the answerable (active, non-Albescent) lives.
 */
import { describe, it, expect } from 'vitest'
import { barredLives, eligibleLives } from '../AlbescentInvitation'
import type { CharacterOut } from '../../api/auth'
import factions from '../../locales/en/factions.json'

function life(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wanderer',
    display_name: 'Wanderer',
    bio: '',
    tagline: '',
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

const CEILING = 8

describe('eligibleLives', () => {
  it('keeps active, non-Albescent lives below the ceiling', () => {
    const lives = [
      life({ id: 1, faction_slug: 'ua', level: 1 }),
      life({ id: 2, faction_slug: 'wow', level: 7 }),
    ]
    expect(eligibleLives(lives, CEILING).map((l) => l.id)).toEqual([1, 2])
  })

  it('drops a non-active life while keeping its sibling', () => {
    const lives = [life({ id: 1, status: 'banned', level: 0 }), life({ id: 2, level: 0 })]
    expect(eligibleLives(lives, CEILING).map((l) => l.id)).toEqual([2])
  })

  it('drops lives already of the Order', () => {
    const lives = [
      life({ id: 1, faction_slug: 'albescent', level: 0 }),
      life({ id: 2, faction_slug: 'na', level: 0 }),
    ]
    expect(eligibleLives(lives, CEILING).map((l) => l.id)).toEqual([2])
  })

  it('returns empty when nobody is fit to answer', () => {
    expect(eligibleLives([life({ status: 'banned' })], CEILING)).toEqual([])
  })

  // #2399 — the ceiling.

  it('drops the life AT the ceiling — it is too late for that one', () => {
    const lives = [life({ id: 1, level: CEILING }), life({ id: 2, level: CEILING - 1 })]
    expect(eligibleLives(lives, CEILING).map((l) => l.id)).toEqual([2])
  })

  it('keeps the level directly below the bar — the boundary is >=, not >', () => {
    expect(eligibleLives([life({ id: 1, level: CEILING - 1 })], CEILING)).toHaveLength(1)
  })

  it('drops a life ABOVE the ceiling, not only one exactly on it', () => {
    expect(eligibleLives([life({ id: 1, level: CEILING + 3 })], CEILING)).toEqual([])
  })

  it('treats a non-positive bar as no ceiling, never as a bar of zero', () => {
    // 0 on the wire = unseeded era; the server still enforces the real ceiling.
    const lives = [life({ id: 1, level: 8 }), life({ id: 2, level: 0 })]
    expect(eligibleLives(lives, 0).map((l) => l.id)).toEqual([1, 2])
    expect(barredLives(lives, 0)).toEqual([])
  })
})

describe('barredLives', () => {
  it('lists the lives the ceiling shut out, rather than hiding them', () => {
    const lives = [life({ id: 1, level: CEILING }), life({ id: 2, level: 2 })]
    expect(barredLives(lives, CEILING).map((l) => l.id)).toEqual([1])
  })

  it('never lists a life that is not answerable in the first place', () => {
    const lives = [
      life({ id: 1, level: CEILING, status: 'banned' }),
      life({ id: 2, level: CEILING, faction_slug: 'albescent' }),
    ]
    expect(barredLives(lives, CEILING)).toEqual([])
  })

  it('partitions the answerable set with eligibleLives — no life in both, none lost', () => {
    const lives = [
      life({ id: 1, level: 0 }),
      life({ id: 2, level: CEILING - 1 }),
      life({ id: 3, level: CEILING }),
      life({ id: 4, level: CEILING + 5 }),
      life({ id: 5, level: 3, status: 'banned' }),
      life({ id: 6, level: 3, faction_slug: 'albescent' }),
    ]
    const eligible = eligibleLives(lives, CEILING).map((l) => l.id)
    const barred = barredLives(lives, CEILING).map((l) => l.id)

    expect(eligible).toEqual([1, 2])
    expect(barred).toEqual([3, 4])
    expect(eligible.filter((id) => barred.includes(id))).toEqual([])
    // 5 and 6 aren't answerable, so get no New Game+ line.
    expect([...eligible, ...barred].sort()).toEqual([1, 2, 3, 4])
  })
})

/*
 * #2300 — Albescent's letter uses the shared `cta.join`/`cta.joined` slot names.
 * Leaf names pinned; key resolution in the rendered letter is checked in
 * `invitationPerks.test.tsx`.
 */
describe("Albescent's letter names the same invitation slots as the other seven (#2300)", () => {
  const leaf = (path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
        factions,
      )

  it('nests the accept control under letter.cta.*', () => {
    // Pins the shape; values are the owner's copy.
    expect(leaf('albescent.letter.cta.join')).toBe('Accept the Honor')
    expect(leaf('albescent.letter.cta.joined')).toBe('You have been chosen')
    expect(leaf('albescent.letter.cta.busy')).toBe('Ascending')
  })

  it('leaves nothing behind under the old flat names', () => {
    expect(leaf('albescent.letter.acceptIdle')).toBeUndefined()
    expect(leaf('albescent.letter.acceptBusy')).toBeUndefined()
    expect(leaf('albescent.letter.joined')).toBeUndefined()
  })
})
