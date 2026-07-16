import { useSyncExternalStore } from 'react'

/**
 * Client-side vote overrides (#626) — "the tally moved because I just voted".
 *
 * A card renders its tally in three sibling components (VoteSummary,
 * PraxisScoreHero, PraxisFooterMeta) that all read the praxis object, which
 * useVote has no way to reach. Rather than drill an onVoted callback through
 * eight faction variants that only draw stamps and hearts, a cast publishes
 * here and the two card dispatchers + usePraxisDetail merge it back in.
 *
 * One writer (useVote), three read points. Keep it that way.
 *
 * An override lives only until the server catches up: every fetch that returns
 * fresh truth for a praxis clears it (see clearVoteOverrides' callers in the
 * api layer). That's the honest retire signal — it makes double-counting on
 * refetch impossible, and stops an override masking another player's vote for
 * longer than it takes the next fetch to land. Deliberately NOT inferred by
 * comparing scores: cards count base+votes and detail pages count votes-only,
 * so there is no one baseline to compare against.
 *
 * ponytail: deliberately not a general optimistic-overlay layer. Flagging and
 * friends have a different shape (a boolean on the control you're already
 * looking at) and no sibling fan-out. Generalize when a second real case shows
 * up, not before.
 */

export interface VoteOverride {
  /** The viewer's vote as the server knew it before the cast; null if unvoted. */
  prior: number | null
  /** The viewer's own current value (1-5). */
  mine: number
}

/** The adjustment a reader adds to the server's own numbers. */
export interface VoteDelta {
  score: number
  voters: number
}

const overrides = new Map<number, VoteOverride>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Record a cast. `prior` is the viewer's vote as the server last reported it
 * (praxis.viewer_vote on a card), used to tell a first vote from a re-vote. A
 * re-vote before the server catches up keeps the original prior — the delta is
 * always measured from server truth, never from my own last guess.
 */
export function recordVote(praxisId: number, stars: number, prior: number | null): void {
  const existing = overrides.get(praxisId)
  overrides.set(praxisId, {
    prior: existing ? existing.prior : prior,
    mine: stars,
  })
  emit()
}

/**
 * Seed the viewer's existing vote. Praxis detail pages have no `viewer_vote` on
 * PraxisOut, but they already fetch the voters list, which carries it — so this
 * is how useVote learns to pre-highlight there, and how a later cast on that
 * page knows it's a re-vote rather than a first vote.
 *
 * Inert by construction: prior === mine, so the delta is 0 points and 0 voters
 * until an actual cast moves `mine`.
 */
export function seedViewerVote(praxisId: number, value: number): void {
  // Any existing entry is either a live cast (which must win — it's newer than
  // whatever the voters list said) or an identical seed (a no-op). Fetches
  // clear first, so a genuinely new seed always finds the slot empty.
  if (overrides.has(praxisId)) return
  overrides.set(praxisId, { prior: value, mine: value })
  emit()
}

/** Drop overrides for praxes the server has just told us the truth about. */
export function clearVoteOverrides(praxisIds: Iterable<number>): void {
  let dropped = false
  for (const praxisId of praxisIds) {
    if (overrides.delete(praxisId)) dropped = true
  }
  if (dropped) emit()
}

/** The viewer's own vote if the client knows it — seeded or cast. */
export function viewerVote(praxisId: number): number | null {
  return overrides.get(praxisId)?.mine ?? null
}

function deltaFrom(entry: VoteOverride): VoteDelta | null {
  const score = entry.mine - (entry.prior ?? 0)
  const voters = entry.prior === null ? 1 : 0
  // A seeded entry (prior === mine) moves nothing. Report it as no delta so
  // readers hand back their input untouched instead of cloning it every render.
  if (score === 0 && voters === 0) return null
  return { score, voters }
}

/** Pure read — the delta to add to the server's numbers, or null for none. */
export function tallyDelta(praxisId: number): VoteDelta | null {
  const entry = overrides.get(praxisId)
  return entry ? deltaFrom(entry) : null
}

/** Subscribing read for the three merge points. */
export function useVoteOverride(praxisId: number): VoteDelta | null {
  const read = () => overrides.get(praxisId) ?? null
  // Third arg is the server snapshot: praxis cards render through
  // renderToString in the archetype tests, and useSyncExternalStore throws
  // without it. Nobody has voted during an SSR pass, so it's always null.
  const entry = useSyncExternalStore(subscribe, read, () => null)
  return entry ? deltaFrom(entry) : null
}

/** Test seam only. */
export function __resetVoteOverrides(): void {
  overrides.clear()
  emit()
}
