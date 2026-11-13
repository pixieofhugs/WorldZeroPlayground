/**
 * #2770: Albescent absent below the glimpse level. Unlike redaction (drawn,
 * unreadable), a concealed row is never BUILT, so the gate sits in the list
 * builders. The share denominator must close too, or the percentages leave a
 * hole (ADR-0082 §4). Module flags reset in `afterEach`.
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
    // Consecutive states: absent, then `[REDACTED]` (ADR-0082).
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

    // Its points leave the pot with its lane.
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
  /* Source tests (a fetching hook can't be driven statically): the filter lives
     in the shared hook, not the two directories. Comments stripped. */

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
    /* No `desc`: `LevelUpPopup` renders `{desc && ...}`, and the rung must give
       no hints. */
    const catalogue = JSON.parse(
      readFileSync(join(SRC_DIR, 'locales', 'en', 'progression.json'), 'utf-8'),
    )
    expect(catalogue.unlocks.albescent_glimpse).toEqual({
      name: 'Now mysteries will reveal themselves to you',
    })
  })
})
