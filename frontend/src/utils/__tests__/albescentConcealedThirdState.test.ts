/**
 * #2770 — Albescent's third state: absent below the glimpse level.
 *
 * SEAM: `isFactionConcealed`, and the two LIST builders that consult it. The
 * distinction #2770 turns on is that concealment is not a rendering rule the way
 * ADR-0082's redaction is — a redacted row is drawn and unreadable, a concealed
 * row is never built. So the gate is answered where the lists are made
 * (`useFactionsDirectory`, `factionStandings`) and nothing below them learns
 * there was ever a third state. Testing it at a component would be testing the
 * wrong layer: the select tile and the race lane are correct either way, because
 * they are not reached.
 *
 * The share denominator is the assertion that matters most. ADR-0082 §4 put
 * Albescent's points in the pot when it gave the society a lane, and accepted
 * that the number leaks its size. A viewer who is not shown the lane must not
 * pay that: if the lane were dropped at the two render sites instead, seven
 * percentages would add to less than 100 and the arithmetic hole would be a
 * sharper tell than the redacted lane it replaced.
 *
 * The module-level flags outlive the case that set them, so both are reset in
 * `afterEach` — a leaked `true` makes a later assertion pass for the wrong
 * reason, exactly as `setAlbescentRevealed`'s own docblock warns.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SRC_DIR, readStripped } from '../../test/sourceScan'
import type { CharacterOut } from '../../api/auth'
import {
  ALBESCENT_FACTION_SLUG,
  isFactionConcealed,
  isFactionRedacted,
  setAlbescentGlimpsed,
  setAlbescentRevealed,
} from '../factions'
import { factionStandings, rankPlayers } from '../../pages/players/playersData'

afterEach(() => {
  setAlbescentGlimpsed(false)
  setAlbescentRevealed(false)
})

/** Enough of a character for the race: a slug and the two score fields. */
function player(faction_slug: string, score: number): CharacterOut {
  return { faction_slug, score, all_time_score: score } as CharacterOut
}

describe('isFactionConcealed — the state in front of the redaction', () => {
  it('conceals by default, so every pre-/auth/me state is the secret one', () => {
    expect(isFactionConcealed(ALBESCENT_FACTION_SLUG)).toBe(true)
  })

  it('stops concealing once the account has glimpsed, and then redacts instead', () => {
    setAlbescentGlimpsed(true)
    expect(isFactionConcealed(ALBESCENT_FACTION_SLUG)).toBe(false)
    // The two states are consecutive, not alternatives: the row that stops
    // being absent starts being `[REDACTED]`, which is ADR-0082 unchanged.
    expect(isFactionRedacted(ALBESCENT_FACTION_SLUG)).toBe(true)
  })

  it('never conceals from a revealed viewer, whatever the glimpse flag says', () => {
    setAlbescentGlimpsed(false)
    setAlbescentRevealed(true)
    expect(isFactionConcealed(ALBESCENT_FACTION_SLUG)).toBe(false)
    expect(isFactionRedacted(ALBESCENT_FACTION_SLUG)).toBe(false)
  })

  it('is about one slug and nothing else', () => {
    for (const slug of ['na', 'ua', 'coven', '', null, undefined]) {
      expect(isFactionConcealed(slug)).toBe(false)
    }
  })
})

describe('the race lane is not built for a concealed viewer', () => {
  const field = [
    player('coven', 100),
    player(ALBESCENT_FACTION_SLUG, 60),
    player('wow', 40),
  ]
  const ranked = () => rankPlayers(field, 'era')

  it('drops the eighth lane entirely — no row, no bar, no zeroed placeholder', () => {
    const slugs = factionStandings(ranked()).map((lane) => lane.slug)
    expect(slugs).not.toContain(ALBESCENT_FACTION_SLUG)
  })

  it('keeps the lane once glimpsed, redacted rather than absent (ADR-0082 §4)', () => {
    setAlbescentGlimpsed(true)
    const slugs = factionStandings(ranked()).map((lane) => lane.slug)
    expect(slugs).toContain(ALBESCENT_FACTION_SLUG)
  })

  it('closes the share denominator, so the concealed viewer sees no hole', () => {
    const concealed = factionStandings(ranked())
    const total = concealed.reduce((sum, lane) => sum + lane.sharePercent, 0)
    expect(Math.round(total)).toBe(100)

    // And the society's points leave the pot with its lane: the leader owns
    // 100/140 when Albescent races and 100/140 - its 60 when it does not.
    const coven = concealed.find((lane) => lane.slug === 'coven')
    expect(coven?.sharePercent).toBeCloseTo((100 / 140) * 100, 5)

    setAlbescentGlimpsed(true)
    const glimpsed = factionStandings(ranked())
    expect(Math.round(glimpsed.reduce((s, l) => s + l.sharePercent, 0))).toBe(100)
    expect(glimpsed.find((lane) => lane.slug === 'coven')?.sharePercent).toBeCloseTo(
      (100 / 200) * 100,
      5,
    )
  })
})

describe('the gate sits where the lists are built', () => {
  /* Source tests, the same posture as `authRefetchLedger`: the harness is
     `renderToStaticMarkup` with no DOM and no effects, so a hook that fetches
     cannot be driven here. What a test CAN hold is that the one-line filter is
     in the shared hook rather than copied into the two directories — comments
     stripped first, so a mention in a docblock cannot satisfy it. */

  it('the directory hook filters the concealed row for both form factors', () => {
    const source = readStripped(
      join(SRC_DIR, 'pages', 'factions', 'useFactionsDirectory.ts'),
    )
    expect(source).toMatch(/isFactionConcealed\(f\.slug\)/)
  })

  it('neither directory surface re-implements the gate below that hook', () => {
    for (const file of [
      join(SRC_DIR, 'pages', 'Factions.tsx'),
      join(SRC_DIR, 'pages', 'factions', 'mobileArchetypes', 'FactionsDirectoryView.tsx'),
    ]) {
      expect(readStripped(file)).not.toMatch(/isFactionConcealed/)
    }
  })

  it('AuthContext points the concealment at the viewer, once, beside the mask', () => {
    const source = readStripped(join(SRC_DIR, 'auth', 'AuthContext.tsx'))
    expect(source).toMatch(/setAlbescentGlimpsed\(me\?\.albescent_glimpsed \?\? false\)/)
    expect(source.match(/setAlbescentGlimpsed\(/g)).toHaveLength(1)
  })

  it('the catalogue keeps the level-6 rung wordless past its name (#2409)', () => {
    /* "I'm not going to give them hints on how" — the pop-up says the line and
       stops. `LevelUpPopup` renders the description as `{desc && ...}`, so the
       absence of the field is the whole mechanism; a `desc` added later would
       explain the door this rung exists to merely mention. */
    const catalogue = JSON.parse(
      readFileSync(join(SRC_DIR, 'locales', 'en', 'progression.json'), 'utf-8'),
    )
    expect(catalogue.unlocks.albescent_glimpse).toEqual({
      name: 'Now mysteries will reveal themselves to you',
    })
  })
})
