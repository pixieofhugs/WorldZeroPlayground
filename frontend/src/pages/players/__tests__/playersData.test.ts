/**
 * The Players page's shared derivations (#1855).
 *
 * SEAM: every number the podium, the faction race and the roster draw is
 * computed here, out of the two components that draw them. Desktop and mobile
 * are structurally different surfaces over ONE data layer, so a rule asserted
 * here is asserted for both — and the repo's harness has no DOM, so this is
 * also the only place the pin/gap arithmetic can be pinned at all.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { CharacterOut } from '../../../api/auth'
import { FACTION_RAINBOW_ORDER, setAlbescentGlimpsed } from '../../../utils/factions'
import {
  PLAYERS_FILTERS_DEFAULT,
  PODIUM_SIZE,
  factionStandings,
  hasActiveFilter,
  rankPlayers,
  rosterView,
  selectRoster,
  type PlayersFilters,
} from '../playersData'

function player(overrides: Partial<CharacterOut>): CharacterOut {
  return {
    id: 1,
    username: 'wren',
    display_name: 'Wren',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 100,
    all_time_score: 100,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

/** Ten players, one per rank, so a rank is readable straight off the score. */
const FIELD: CharacterOut[] = [
  player({ id: 1, display_name: 'Wren', faction_slug: 'coven', score: 400, all_time_score: 10 }),
  player({ id: 2, display_name: 'Ada', faction_slug: 'ua', score: 380, all_time_score: 20 }),
  player({ id: 3, display_name: 'node_44', faction_slug: 'singularity', score: 340, all_time_score: 30 }),
  player({ id: 4, display_name: 'Pip', faction_slug: 'wow', score: 300, all_time_score: 40 }),
  player({ id: 5, display_name: 'Rax', faction_slug: 'snide', score: 270, all_time_score: 50 }),
  player({ id: 6, display_name: 'Sam', faction_slug: 'everymen', score: 240, all_time_score: 60 }),
  player({ id: 7, display_name: 'Iris', faction_slug: 'ephemerists', score: 210, all_time_score: 70 }),
  player({ id: 8, display_name: 'Molly', faction_slug: 'na', score: 180, all_time_score: 80 }),
  player({ id: 9, display_name: 'Juno', faction_slug: 'coven', score: 160, all_time_score: 90 }),
  player({ id: 10, display_name: 'Ozzy', faction_slug: 'ua', score: 140, all_time_score: 100 }),
]

const NOBODY = { friends: new Set<number>(), foes: new Set<number>() }

function filters(overrides: Partial<PlayersFilters> = {}): PlayersFilters {
  return { ...PLAYERS_FILTERS_DEFAULT, ...overrides }
}

describe('rankPlayers', () => {
  it('ranks globally, descending, in the active score mode', () => {
    const era = rankPlayers(FIELD, 'era')
    expect(era.map((row) => row.character.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(era[0]).toMatchObject({ rank: 1, points: 400 })
    expect(era[9]).toMatchObject({ rank: 10, points: 140 })
  })

  it('re-ranks the whole field on the all-time toggle', () => {
    const allTime = rankPlayers(FIELD, 'alltime')
    expect(allTime.map((row) => row.character.id)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    expect(allTime[0]).toMatchObject({ rank: 1, points: 100 })
  })
})

describe('factionStandings', () => {
  const ranked = rankPlayers(FIELD, 'era')

  // #2770 put a state in FRONT of the redaction: below the era's glimpse level
  // the eighth lane is not built at all. Every case here is about the lane
  // EXISTING, which is the glimpsed state, so the flag is set for all of them —
  // the concealed half lives in `utils/__tests__/albescentConcealedThirdState`,
  // where the share denominator closing over seven lanes is the assertion.
  // Reset after each: the flag is module-level and outlives the case that set it.
  beforeEach(() => setAlbescentGlimpsed(true))
  afterEach(() => setAlbescentGlimpsed(false))

  it('races the seven factions PLUS Albescent, and nobody else', () => {
    // The eighth lane (#2409, ADR-0082). This case read "the seven factions and
    // nobody else" and asserted equality with FACTION_RAINBOW_ORDER, which was
    // #1855's ruling that the design's Albescent row was a deviation to drop.
    // Reversed: the society races like the rest and reads `[REDACTED]` to a
    // viewer who has not been revealed to it.
    const slugs = factionStandings(ranked).map((lane) => lane.slug)
    expect(slugs).toHaveLength(FACTION_RAINBOW_ORDER.length + 1)
    expect([...slugs].sort()).toEqual(
      [...FACTION_RAINBOW_ORDER, 'albescent'].sort(),
    )
    // UNCHANGED, and the point of keeping it on the same line as the change
    // above: `na` is a state, not a faction (ADR-0030/ADR-0039). The two
    // exclusions were never the same exclusion and only one of them moved.
    expect(slugs).not.toContain('na')
    // Albescent is NOT in the spectrum — the lane list is its own constant, so
    // the stripe bar, the backdrop and the filter facet keep seven.
    expect(FACTION_RAINBOW_ORDER).not.toContain('albescent')
  })

  it("sums each faction's members and sorts by points", () => {
    const [leader, second] = factionStandings(ranked)
    expect(leader).toMatchObject({ slug: 'coven', points: 560 })
    expect(second).toMatchObject({ slug: 'ua', points: 520 })
  })

  it('shares out FACTIONED points only — the unaffiliated 180 is not in the pot', () => {
    const lanes = factionStandings(ranked)
    const factioned = lanes.reduce((sum, lane) => sum + lane.points, 0)
    expect(factioned).toBe(2440)
    expect(lanes[0].sharePercent).toBeCloseTo((560 / 2440) * 100, 5)
    expect(lanes.reduce((sum, lane) => sum + lane.sharePercent, 0)).toBeCloseTo(100, 5)
  })

  it('measures the bar against the leader, who is full width', () => {
    const lanes = factionStandings(ranked)
    expect(lanes[0].barPercent).toBe(100)
    expect(lanes[1].barPercent).toBeCloseTo((520 / 560) * 100, 5)
  })

  it('draws an empty faction as a zero-length bar rather than dropping it', () => {
    // Load-bearing for Albescent specifically since #2409: a fixed lane list is
    // what guarantees the eighth row is THERE on a page whose loaded characters
    // happen to include no member of it. A data-driven list would make the
    // society's absence from one roster page look like the society not existing.
    const lanes = factionStandings(rankPlayers([player({ id: 1, faction_slug: 'coven', score: 10 })], 'era'))
    expect(lanes).toHaveLength(FACTION_RAINBOW_ORDER.length + 1)
    expect(lanes.map((lane) => lane.slug)).toContain('albescent')
    const empty = lanes.filter((lane) => lane.points === 0)
    expect(empty).toHaveLength(FACTION_RAINBOW_ORDER.length)
    expect(empty.every((lane) => lane.barPercent === 0 && lane.sharePercent === 0)).toBe(true)
  })

  it('survives a field with no factioned points at all', () => {
    const lanes = factionStandings(rankPlayers([player({ id: 1, faction_slug: 'na', score: 90 })], 'era'))
    expect(lanes.every((lane) => lane.barPercent === 0 && lane.sharePercent === 0)).toBe(true)
  })
})

describe('hasActiveFilter', () => {
  it('is false only when nothing is narrowing the list', () => {
    expect(hasActiveFilter(filters())).toBe(false)
    expect(hasActiveFilter(filters({ query: 'wr' }))).toBe(true)
    expect(hasActiveFilter(filters({ query: '   ' }))).toBe(false)
    expect(hasActiveFilter(filters({ rail: 'friends' }))).toBe(true)
    expect(hasActiveFilter(filters({ factions: ['coven'] }))).toBe(true)
  })
})

describe('selectRoster', () => {
  const ranked = rankPlayers(FIELD, 'era')

  it('is ranks 4+ at rest — the top three are on the podium', () => {
    const rows = selectRoster(ranked, filters(), NOBODY)
    expect(rows[0].rank).toBe(PODIUM_SIZE + 1)
    expect(rows).toHaveLength(FIELD.length - PODIUM_SIZE)
  })

  it('opens up to the full list from rank 1 the moment a filter is on', () => {
    const rows = selectRoster(ranked, filters({ query: 'wren' }), NOBODY)
    expect(rows.map((row) => row.rank)).toEqual([1])
  })

  it('does not hide a faction its best member ranks top three for', () => {
    const rows = selectRoster(ranked, filters({ factions: ['coven'] }), NOBODY)
    expect(rows.map((row) => row.character.display_name)).toEqual(['Wren', 'Juno'])
  })

  it('matches the search case-insensitively on display name', () => {
    const rows = selectRoster(ranked, filters({ query: 'JUN' }), NOBODY)
    expect(rows.map((row) => row.character.id)).toEqual([9])
  })

  it('filters the unaffiliated through the `na` sentinel', () => {
    const rows = selectRoster(ranked, filters({ factions: ['na'] }), NOBODY)
    expect(rows.map((row) => row.character.id)).toEqual([8])
  })

  it('unions the selected factions', () => {
    const rows = selectRoster(ranked, filters({ factions: ['ua', 'snide'] }), NOBODY)
    expect(rows.map((row) => row.character.id)).toEqual([2, 5, 10])
  })

  it('reads the rails off the viewer\'s own outgoing edges', () => {
    const related = { friends: new Set([2, 9]), foes: new Set([5]) }
    expect(selectRoster(ranked, filters({ rail: 'friends' }), related).map((r) => r.character.id))
      .toEqual([2, 9])
    expect(selectRoster(ranked, filters({ rail: 'foes' }), related).map((r) => r.character.id))
      .toEqual([5])
  })
})

describe('rosterView — "show me my row"', () => {
  const ranked = rankPlayers(FIELD, 'era')
  const roster = selectRoster(ranked, filters(), NOBODY) // ranks 4–10

  it('pins the signed-in player below a gap row naming the ranks it skips', () => {
    const view = rosterView(roster, 2, 9) // ranks 4–5 loaded; Juno is rank 9
    expect(view.rows.map((row) => row.rank)).toEqual([4, 5])
    expect(view.gap).toEqual({ from: 6, to: 8 })
    expect(view.pinned?.character.id).toBe(9)
    expect(view.hasMore).toBe(true)
  })

  it('draws no pin and no gap when signed out', () => {
    const view = rosterView(roster, 2, null)
    expect(view.gap).toBeNull()
    expect(view.pinned).toBeNull()
  })

  it('draws no pin when the player is on the podium — they are already shown', () => {
    const view = rosterView(roster, 2, 1) // Wren is rank 1, so not in the roster
    expect(view.gap).toBeNull()
    expect(view.pinned).toBeNull()
  })

  it('highlights only, with no gap row, when the player is on the loaded page', () => {
    const view = rosterView(roster, 4, 5) // Rax is rank 5, inside ranks 4–7
    expect(view.rows.map((row) => row.rank)).toEqual([4, 5, 6, 7])
    expect(view.gap).toBeNull()
    expect(view.pinned).toBeNull()
  })

  it('collapses the gap once enough rows are loaded to reach the player', () => {
    const view = rosterView(roster, roster.length, 9)
    expect(view.gap).toBeNull()
    expect(view.pinned).toBeNull()
    expect(view.hasMore).toBe(false)
  })

  it('pins without a gap when the player is the very next row past the page', () => {
    // The boundary between "on the page" and "below a gap": rank 6 sits one
    // row past ranks 4-5, so there is nothing for a gap row to name. Naming it
    // anyway printed the range backwards, "Ranks 6-5".
    const view = rosterView(roster, 2, 6)
    expect(view.rows.map((row) => row.rank)).toEqual([4, 5])
    expect(view.gap).toBeNull()
    expect(view.pinned?.rank).toBe(6)
    expect(view.hasMore).toBe(true)
  })

  it('shows nothing extra when a filter has excluded the player', () => {
    const filtered = selectRoster(ranked, filters({ factions: ['ua'] }), NOBODY)
    const view = rosterView(filtered, 1, 9)
    expect(view.rows.map((row) => row.character.id)).toEqual([2])
    expect(view.gap).toBeNull()
    expect(view.pinned).toBeNull()
  })

  it('counts the FILTERED set, not the field', () => {
    const filtered = selectRoster(ranked, filters({ factions: ['coven'] }), NOBODY)
    expect(rosterView(filtered, 8, null).total).toBe(2)
  })
})
