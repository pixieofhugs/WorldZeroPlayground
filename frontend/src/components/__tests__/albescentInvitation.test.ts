/**
 * The Albescent invitation's life chooser (#395) only offers active,
 * non-Albescent lives — a banned life can't be carried, and a life already of
 * the Order has nothing left to accept. Pure filter, tested directly (no jsdom
 * in this repo — see vite.config.ts).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { eligibleLives } from '../AlbescentInvitation'
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

/* ========================================================================== *
 * #2300 — ALBESCENT'S LETTER NAMES THE SAME SLOTS AS THE OTHER SEVEN.
 *
 * THE SEAM IS THE CATALOG LEAF NAME PLUS THE CALL SITE THAT WRITES IT. The
 * seven shared letters (`InvitationLetterPopup`) reach for
 * `<slug>.invitation.cta.join` / `.cta.joined`; Albescent's own letter reached
 * for flat `letter.acceptIdle` / `letter.joined`, so one copy change meant two
 * edits in two vocabularies. The components stay separate — the character
 * picker, the account-level `can_start_as_albescent` trigger, ADR-0027 secrecy,
 * and the letter's own vellum tokens — but the vocabulary does not have to be.
 *
 * Two assertions, because a key rename has two halves and each fails silently
 * on its own: `tsc` sees neither, and a missed call site renders the literal
 * key string onto the vellum rather than throwing. So the leaf names are
 * pinned, AND every `albescent.letter.*` literal in the component is required
 * to resolve. The dynamic `tDynamic` stems (terms, perks) carry no literal and
 * are out of this check's reach by construction — `scripts/i18nKeyRefs.py` is
 * the tool for those.
 * ========================================================================== */
describe("Albescent's letter names the same invitation slots as the other seven (#2300)", () => {
  const SOURCE = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../AlbescentInvitation.tsx'),
    'utf8',
  )

  const leaf = (path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
        factions,
      )

  it('nests the accept control under letter.cta.*, with the copy unchanged', () => {
    expect(leaf('albescent.letter.cta.join')).toBe('Accept the order')
    expect(leaf('albescent.letter.cta.joined')).toBe('You are of the Order')
    // `busy` has no counterpart to align to — the shared popup reuses its idle
    // label while disabled — so it joins the nest rather than taking a name
    // from it.
    expect(leaf('albescent.letter.cta.busy')).toBe('Entering the record…')
  })

  it('leaves nothing behind under the old flat names', () => {
    expect(leaf('albescent.letter.acceptIdle')).toBeUndefined()
    expect(leaf('albescent.letter.acceptBusy')).toBeUndefined()
    expect(leaf('albescent.letter.joined')).toBeUndefined()
  })

  it('resolves every albescent.letter key the component writes as a literal', () => {
    const literals = [...SOURCE.matchAll(/albescent\.letter\.([A-Za-z][\w.]*)/g)].map((m) => m[1])
    expect(literals.length).toBeGreaterThan(0)
    expect(literals.filter((key) => typeof leaf(`albescent.letter.${key}`) !== 'string')).toEqual([])
  })
})
