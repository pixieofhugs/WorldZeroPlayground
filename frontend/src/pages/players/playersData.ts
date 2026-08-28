/**
 * Everything the Players page COMPUTES, kept out of the two surfaces that draw
 * it (#1855).
 *
 * Desktop and mobile are structurally different — mobile's race has no bars, no
 * percentages and no rank column, and its roster drops the faction line — so
 * they are two components over one data layer rather than breakpoints in one
 * tree. That data layer is this file plus the fetches in `pages/Leaderboard`.
 *
 * All of it is client-side derivation over the ONE `GET /leaderboard` page, and
 * deliberately so:
 *
 * - **Faction points are the sum of a faction's members' scores.** That is the
 *   definition, not an approximation of one, so there is no endpoint to add and
 *   no `FactionOut` field to grow (it is `{slug, status}` and stays that way).
 * - **The lanes are a fixed list, not the slugs present in the data.** A
 *   faction whose members all sit at zero still races, and a faction the roster
 *   page happens not to contain does not silently vanish.
 * - **There are EIGHT lanes now, and the eighth is Albescent (#2409).** This
 *   docstring used to say the fixed list was what "keeps Albescent out of the
 *   race, which a data-driven lane list could not promise (ADR-0027)", and
 *   #1855 ruled the design's eighth lane a deliberate deviation to be dropped.
 *   **ADR-0082 reverses both.** Albescent races like every other society and
 *   reads `[REDACTED]` to a viewer who has not been revealed to it — a blank
 *   lane that yields the word on selection. The fixed list is still the right
 *   shape and now does the opposite job: it guarantees the lane is THERE even
 *   when the loaded page contains no Albescent member, so its absence from a
 *   roster page cannot be read as the society not existing.
 * - **`na` STILL gets no lane, and that is unchanged.** Unaffiliated is a
 *   state, not a faction (ADR-0030 / ADR-0039), so its points are not in the
 *   race and not in the share denominator. The two exclusions were never the
 *   same exclusion, which is why only one of them moved.
 * - **The share denominator moved with the lane, and that is accepted.**
 *   Albescent's points are in the pot now, so every other faction's percentage
 *   changed. It leaks the society's SIZE while its name stays hidden; the owner
 *   ruled the lane shows as the others do and a second redaction over the
 *   number is explicitly not wanted (#2409).
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
 * Where a faction NAME printed on this page links to — or `null` when that name
 * must not be a link at all (#1953).
 *
 * ONE rule for all three sections, because two would eventually disagree and
 * only one of the disagreements is cosmetic.
 *
 * Two slugs answer `null`, for two unrelated reasons:
 *
 *   - **`na` / a null slug.** Unaffiliated is a state, not a faction (ADR-0030 /
 *     ADR-0039), so there is nothing to open. `/factions/na` is not merely
 *     pointless, it is broken: `na` is seeded hidden, `GET /factions` returns
 *     visible rows only and `FactionDetail` derives from that list, so it
 *     renders "Faction not found" for exactly the population the link would
 *     serve. `DefaultEditCharacter` sends `na` to the `/factions` DIRECTORY
 *     instead; that is a page about the viewer's own character offering them a
 *     next step. A roster row is a LABEL on someone else, and a label whose
 *     only honest destination is "here are all the factions" is not a link.
 *
 *   - **`albescent`, for a viewer who has not been revealed to it (#1926).**
 *     `factionName()` already masks the word to "Unaffiliated" for them — but an
 *     href is the leak the mask exists to prevent, wearing a different label.
 *     `/factions/albescent` in the markup names the secret society in plain
 *     text, and following it lands on `AlbescentSecretPlaceholder`, which tells
 *     an unrevealed player that the "Unaffiliated" row they just clicked is a
 *     sealed door. `isFactionHiddenFromChoosers` is the exported read of that
 *     reveal flag; its name is about choosers, and a link is the stronger case
 *     of the same question — do not show this viewer a way to pick this out.
 *     A REVEALED viewer gets the ordinary `/factions/albescent`, which
 *     `AlbescentGate` hands the real faction page.
 *
 * ONE OF THOSE TWO IS NOW A RACE LANE. This used to read "the race lanes can be
 * neither by construction (`factionStandings` keys off `FACTION_RAINBOW_ORDER`,
 * which holds neither slug), and they still route through here on purpose: the
 * mask must not depend on the lane list staying that way." The lane list did
 * not stay that way — #2409 gave Albescent the eighth lane — and routing
 * through here anyway is what makes that a one-line change instead of a leak.
 * An unrevealed viewer's lane prints `[REDACTED]` and carries no href; a
 * revealed one gets the ordinary link.
 */
export function factionHref(slug: string | null | undefined): string | null {
  const key = slugKey(slug)
  if (key === UNAFFILIATED_FACTION_SLUG) return null
  if (isFactionHiddenFromChoosers(key)) return null
  return `/factions/${key}`
}

/**
 * The field, ranked. Sort is stable and the server already returns score DESC,
 * id ASC, so ties keep a deterministic order. Rank is the true global standing
 * over everyone — never an index into a slice.
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
 * The lanes of the race, in order: the rainbow, then Albescent (#2409).
 *
 * Appended HERE rather than added to `FACTION_RAINBOW_ORDER`, and the
 * difference is the whole reason this constant exists. That array is the colour
 * SPECTRUM — it feeds the mobile directory's stripe bar, the backdrop and the
 * filter facet, and it distributes gradient stops across whatever is in it.
 * Albescent owns no hue (`factionCssVar('albescent')` resolves to the neutral
 * default, #783) so it has no slot in a spectrum, and putting it there would
 * hand three unrelated surfaces an eighth stripe none of them asked for.
 *
 * What it has is a place in the RACE, which is about points and not colour.
 */
const RACE_LANES: readonly string[] = [
  ...FACTION_RAINBOW_ORDER,
  ALBESCENT_FACTION_SLUG,
]

/**
 * THE EIGHTH LANE IS NOT BUILT FOR A CONCEALED VIEWER (#2770, amending
 * ADR-0082 §4).
 *
 * ADR-0082 made the lane a hardcoded eighth so an empty society could not have
 * its absence read as its non-existence. That still holds — from the era's
 * glimpse level up. Below it there is no lane at all, and dropping it HERE
 * rather than at the two render sites is what makes the absence complete
 * instead of merely quiet:
 *
 *   - the SHARE DENOMINATOR is computed below over whatever lanes survive, so a
 *     concealed viewer's seven percentages add to 100. Filtering in the two
 *     `Desktop/MobilePlayers` render loops would have left them adding to less
 *     than 100 — an arithmetic hole where the eighth row used to be, which is a
 *     sharper tell than the redacted lane it replaced.
 *   - the society's points leave the pot with its lane, exactly as `na`'s
 *     always have. ADR-0082 §4 accepted the size leak as the cost of showing
 *     the lane; a viewer who is not shown the lane does not pay it.
 *
 * Impure, and the same impurity as `factionName`'s: the same roster answers
 * differently for two viewers. That is the #1891 cost this module already pays
 * through `factionHref`.
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

/** The roster's three axes. One rail, one facet, one search box. */
export type PlayersRail = 'everyone' | 'friends' | 'foes'

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

/**
 * The viewer's own OUTGOING edges (`GET /relationships` answers no others), so
 * "Friends" means the characters this player has declared a friend — not the
 * ones who declared them. No reverse-edge logic, deliberately: the reverse edge
 * is another player's statement and is not the viewer's list.
 */
export interface ViewerRelationships {
  friends: ReadonlySet<number>
  foes: ReadonlySet<number>
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
 * The rows the roster draws.
 *
 * At rest that is ranks 4+ — the top three are already on the podium above, and
 * printing them twice on one screen reads as a bug. The instant ANY filter is
 * on it becomes the full list from rank 1, so searching the leader finds them
 * and the Coven facet does not hide Coven's best member. One condition, because
 * two would eventually disagree.
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
    if (needle && !character.display_name.toLowerCase().includes(needle)) return false
    return true
  })
}

/**
 * The two strings a podium card's footer draws, from the player's most recent
 * SUBMITTED praxis. Fetched for the top three only, after the roster resolves —
 * the page renders fully without them and the footer simply does not draw when
 * one is missing or its request failed.
 */
interface LatestPraxis {
  taskTitle: string
  submittedAt: string | null
}

/** Character id → their latest praxis. Only ever holds the podium three. */
export type LatestPraxisMap = Record<number, LatestPraxis>

/**
 * What a form factor needs to draw the page. Desktop and mobile take the same
 * props and differ only in what they do with them — the split is structural
 * (mobile's race has no bars and no rank column, its roster no faction line),
 * not a difference in data.
 */
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
 * "Show me my row". Rows render to the end of the loaded page, then — only if
 * the viewer's own row is further down than that — a gap row naming the ranks
 * it skips, then their row.
 *
 * Five cases, all of them falling out of one lookup rather than five branches:
 * signed out (`myCharId` null) → no pin; on the podium or filtered out (absent
 * from `roster`) → no pin; already on the page → highlight only; loaded past
 * → the gap collapses and the pin merges back into the flat list.
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

  // The viewer can sit exactly one row past the loaded page, in which case
  // there is nothing between the page and them and the gap row would read
  // backwards ("Ranks 6-5"). Pin without a gap: `hasMore` still says the list
  // continues, and one more "load more" merges them into the flat list.
  const skipped = mine - rows.length
  return {
    ...base,
    gap: skipped > 0 ? { from: roster[rows.length].rank, to: roster[mine - 1].rank } : null,
    pinned: roster[mine],
  }
}
