/**
 * Everything the Players page computes, shared by the desktop and mobile
 * surfaces (#1855), all derived client-side from one `GET /leaderboard` page.
 *
 * - Faction points = sum of members' scores (the definition; no endpoint).
 * - Lanes are a fixed list, so zero-point or absent factions still race; the
 *   eighth is Albescent (ADR-0082), so its absence can't read as non-existence.
 * - `na` gets no lane and is not in the share denominator (ADR-0030).
 * - Albescent's points are in the denominator; the size leak is accepted (#2409).
 */
import type { CharacterOut } from '../../api/auth'
import {
  ALBESCENT_FACTION_SLUG,
  FACTION_RAINBOW_ORDER,
  UNAFFILIATED_FACTION_SLUG,
  isFactionConcealed,
  isFactionHiddenFromChoosers,
} from '../../utils/factions'

/** How many players stand on the podium. The roster starts below them. */
export const PODIUM_SIZE = 3

/** Rows one "Load more" reveals. Both form factors accumulate by this step. */
export const ROSTER_PAGE_STEP = 8

export type ScoreMode = 'era' | 'alltime'

/** A character with its computed standing, shared by every section. */
export interface RankedPlayer {
  character: CharacterOut
  /** 1-based standing in the current score mode, over the WHOLE field. */
  rank: number
  /** The score being ranked on (era or all-time), already resolved. */
  points: number
}

/** Unaffiliated characters carry a null-ish slug; normalise to the sentinel. */
export function slugKey(slug: string | null | undefined): string {
  return slug ?? UNAFFILIATED_FACTION_SLUG
}

/**
 * Where a faction name on this page links, or `null` for no link (#1953). One
 * rule for all three sections, race lanes included.
 *
 * - `na`/null: not a faction (ADR-0030), and `/factions/na` renders "Faction
 *   not found" since `na` is seeded hidden.
 * - `albescent` for an unrevealed viewer (#1926): the href would leak the name
 *   that `factionName()` masks.
 */
export function factionHref(slug: string | null | undefined): string | null {
  const key = slugKey(slug)
  if (key === UNAFFILIATED_FACTION_SLUG) return null
  if (isFactionHiddenFromChoosers(key)) return null
  return `/factions/${key}`
}

/**
 * Stable sort; the server returns score DESC, id ASC, so ties are deterministic.
 * Rank is the global standing, never a slice index.
 */
export function rankPlayers(characters: CharacterOut[], mode: ScoreMode): RankedPlayer[] {
  const pointsOf = (character: CharacterOut) =>
    mode === 'era' ? character.score : character.all_time_score
  return [...characters]
    .sort((first, second) => pointsOf(second) - pointsOf(first))
    .map((character, index) => ({ character, rank: index + 1, points: pointsOf(character) }))
}

/** One lane of the faction race. */
export interface FactionStanding {
  slug: string
  /** Sum of this faction's members' points in the active score mode. */
  points: number
  /** Share of FACTIONED points, 0–100. Unaffiliated points are not in the pot. */
  sharePercent: number
  /** Bar width, 0–100, measured against the leader — who is full width. */
  barPercent: number
}

/**
 * Race lanes: the rainbow, then Albescent (#2409). Not added to
 * `FACTION_RAINBOW_ORDER`, which is the colour spectrum (stripe bar, backdrop,
 * facet); Albescent owns no hue (#783).
 */
const RACE_LANES: readonly string[] = [
  ...FACTION_RAINBOW_ORDER,
  ALBESCENT_FACTION_SLUG,
]

/**
 * A concealed viewer gets no Albescent lane (#2770, amending ADR-0082 §4).
 * Dropped here, not at the render sites, so the share denominator excludes it
 * and the seven percentages still sum to 100. Viewer-dependent, like
 * `factionHref` (#1891).
 */
export function factionStandings(ranked: RankedPlayer[]): FactionStanding[] {
  const laneSlugs = RACE_LANES.filter((slug) => !isFactionConcealed(slug))
  const points = new Map<string, number>(laneSlugs.map((slug) => [slug, 0]))
  for (const { character, points: earned } of ranked) {
    const slug = slugKey(character.faction_slug)
    const running = points.get(slug)
    if (running !== undefined) points.set(slug, running + earned)
  }

  const lanes = [...points.entries()]
    .map(([slug, total]) => ({ slug, points: total }))
    .sort((first, second) => second.points - first.points)

  const factioned = lanes.reduce((sum, lane) => sum + lane.points, 0)
  const leader = lanes.length > 0 ? lanes[0].points : 0

  return lanes.map((lane) => ({
    ...lane,
    sharePercent: factioned > 0 ? (lane.points / factioned) * 100 : 0,
    barPercent: leader > 0 ? (lane.points / leader) * 100 : 0,
  }))
}

export type PlayersRail = 'everyone' | 'friends' | 'foes' | 'nearby'

export interface PlayersFilters {
  query: string
  rail: PlayersRail
  /** Faction slugs, `na` included as the unaffiliated sentinel. */
  factions: string[]
}

export const PLAYERS_RAIL_DEFAULT: PlayersRail = 'everyone'

export const PLAYERS_FILTERS_DEFAULT: PlayersFilters = {
  query: '',
  rail: PLAYERS_RAIL_DEFAULT,
  factions: [],
}

/** The viewer's OUTGOING edges only; reverse edges are not the viewer's list. */
export interface ViewerRelationships {
  friends: ReadonlySet<number>
  foes: ReadonlySet<number>
  /** Airport codes near the viewer's (#3247); absent/null hides Nearby. */
  nearby?: ReadonlySet<string> | null
}

export const NO_RELATIONSHIPS: ViewerRelationships = {
  friends: new Set<number>(),
  foes: new Set<number>(),
}

export function hasActiveFilter(filters: PlayersFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.rail !== PLAYERS_RAIL_DEFAULT ||
    filters.factions.length > 0
  )
}

/**
 * At rest, ranks 4+ (the podium shows the top three); with any filter on, the
 * full list so a search can find the leader.
 */
export function selectRoster(
  ranked: RankedPlayer[],
  filters: PlayersFilters,
  related: ViewerRelationships,
): RankedPlayer[] {
  const needle = filters.query.trim().toLowerCase()
  const pool = hasActiveFilter(filters) ? ranked : ranked.slice(PODIUM_SIZE)

  return pool.filter(({ character }) => {
    if (filters.factions.length > 0 && !filters.factions.includes(slugKey(character.faction_slug))) {
      return false
    }
    if (filters.rail === 'friends' && !related.friends.has(character.id)) return false
    if (filters.rail === 'foes' && !related.foes.has(character.id)) return false
    if (filters.rail === 'nearby' && !related.nearby?.has(character.location)) return false
    if (needle && !character.display_name.toLowerCase().includes(needle)) return false
    return true
  })
}

/**
 * Podium footer data from the latest submitted praxis; fetched for the top
 * three after the roster, and optional (footer skips when missing).
 */
interface LatestPraxis {
  taskTitle: string
  submittedAt: string | null
}

/** Character id → latest praxis, podium three only. */
export type LatestPraxisMap = Record<number, LatestPraxis>

/** Shared by desktop and mobile; the split is structural, not data. */
export interface PlayersViewProps {
  ranked: RankedPlayer[]
  scoreMode: ScoreMode
  onScoreMode: (mode: ScoreMode) => void
  /** Already resolved against the era config — never a literal (CLAUDE.md). */
  eyebrow: string
  myCharId: number | null
  related: ViewerRelationships
  latest: LatestPraxisMap
}

/** The gap the pin jumps: the global ranks that are loaded past but not drawn. */
interface RosterGap {
  from: number
  to: number
}

interface RosterView {
  /** The loaded page, in rank order. */
  rows: RankedPlayer[]
  /** Set only when the viewer's own row is pinned below the page. */
  gap: RosterGap | null
  /** The viewer's own row, drawn after the gap. Null whenever it is not pinned. */
  pinned: RankedPlayer | null
  hasMore: boolean
  /** Size of the FILTERED set — what the "{{count}} players" chip states. */
  total: number
}

/**
 * The loaded page, then (only if the viewer's row is further down) a gap row
 * naming the skipped ranks, then their row.
 */
export function rosterView(
  roster: RankedPlayer[],
  visible: number,
  myCharId: number | null,
): RosterView {
  const rows = roster.slice(0, visible)
  const base: RosterView = {
    rows,
    gap: null,
    pinned: null,
    hasMore: visible < roster.length,
    total: roster.length,
  }
  if (myCharId == null) return base

  const mine = roster.findIndex((row) => row.character.id === myCharId)
  if (mine < 0 || mine < rows.length) return base

  // Exactly one row past the page: no gap row (it would read "Ranks 6-5").
  const skipped = mine - rows.length
  return {
    ...base,
    gap: skipped > 0 ? { from: roster[rows.length].rank, to: roster[mine - 1].rank } : null,
    pinned: roster[mine],
  }
}
