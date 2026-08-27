/**
 * The Albescent invitation's life chooser (#395, re-cut by #2399).
 *
 * It offers active, non-Albescent lives — a banned life can't be carried, and a
 * life already of the Order has nothing left to accept — and since #2399 it also
 * excludes lives at `albescent_level_required`. Albescent is a New Game+
 * faction: the life that earned the account its door is exactly the life that
 * may not walk through it. Those lives are not dropped from the letter, they are
 * listed by `barredLives` and carry "Available only for New Game+", so the
 * refusal is legible before it is attempted.
 *
 * `eligibleLives` and `barredLives` must PARTITION the answerable set — every
 * active non-Albescent life lands in exactly one — which is the property that
 * makes "shown but not selectable" true rather than merely usually true.
 *
 * Pure filters, tested directly (no jsdom in this repo — see vite.config.ts).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
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

  // Was written against `paused`, the one status the roster carried and the
  // order refused. That value is gone (#1550), so the mixed-list case — one
  // life dropped, its sibling kept — is asserted on the surviving non-active
  // status instead of deleted with it.
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

  /* ---------------------------------------------------------------------- *
   * #2399 — the ceiling. The ONLY maximum-level test in the frontend.
   * ---------------------------------------------------------------------- */

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
    // `albescent_level_required` is 0 on the wire for an unseeded era. Reading
    // that as a real ceiling would bar the whole roster and print "New Game+"
    // at everybody; the server still refuses at the door either way, so the
    // permissive reading is the one that cannot invent a refusal.
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
    // Lives 5 and 6 are answerable by neither, and that is the point: they are
    // not shut out by the CEILING, so they carry no New Game+ line.
    expect([...eligible, ...barred].sort()).toEqual([1, 2, 3, 4])
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

  it('nests the accept control under letter.cta.*', () => {
    // The shape is what this case pins. The three values are the owner's, and
    // her copy pass rewrote all three at once.
    expect(leaf('albescent.letter.cta.join')).toBe('Accept the Honor')
    expect(leaf('albescent.letter.cta.joined')).toBe('You have been chosen')
    // `busy` has no counterpart to align to — the shared popup reuses its idle
    // label while disabled — so it joins the nest rather than taking a name
    // from it.
    expect(leaf('albescent.letter.cta.busy')).toBe('Ascending')
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
