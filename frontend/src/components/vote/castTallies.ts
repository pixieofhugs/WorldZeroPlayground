import { useSyncExternalStore } from 'react'
import type { VoteTallyOut } from '../../api/votes'

/**
 * The tally a cast just returned, until the next fetch supersedes it (#1382).
 *
 * WHY A STORE AT ALL. A surface renders its tally in sibling components (the
 * faction score stamp, the vote line) that all read the praxis object, which
 * `useVote` has no way to reach. Drilling an `onVoted` callback down through
 * nine faction vote variants that only draw stamps and hearts would not even
 * cover it: the reported #1239 case is a spectator rating the RIVAL side of a
 * duel, whose praxis payload is not on that page at all, so there is no object
 * to hand a callback for. Keyed by praxis id, anything on the page can be moved
 * by a cast anywhere on the page.
 *
 * WHAT #1382 CHANGED. This used to hold a hand-computed *delta* — the viewer's
 * prior star against their new one, plus a seeded entry so a re-vote could be
 * told from a first vote — and three sibling functions applied that delta to
 * three payload shapes. The vote POST now returns the server's own post-write
 * tally, so an entry is TRUTH rather than an adjustment: readers overwrite the
 * two numbers instead of doing arithmetic on them. #1142 and #1239 were both
 * that arithmetic drifting between copies, and there is no longer any.
 *
 * An entry lives only until the server catches up: every fetch that returns
 * fresh truth for a praxis clears it (see `clearCastTallies`' callers in the
 * api layer). Still required, and for a sharper reason than before — a stored
 * tally is authoritative only for the instant it was minted, so keeping it
 * would mask another player's later vote rather than merely double-count.
 *
 * ponytail: deliberately not a general query cache. It holds one number pair
 * per write, cleared by the next read of the same id. If a second write ever
 * needs the same treatment, reach for a real cache then — not now.
 *
 * THAT SECOND WRITE ARRIVED, and the answer was still no (#1895). The deferred
 * cast lives BESIDE this store, in `pendingCasts.ts`, because it needs the
 * opposite lifecycle: a tally must be dropped by the next fetch, client intent
 * must survive it. Reasoning in full at the top of that file. Two small stores,
 * no query library — revisit at a third.
 */

const tallies = new Map<number, VoteTallyOut>()
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
 * Publish the tally a cast returned. Last write wins outright — it came from
 * the server after every earlier one, so there is nothing to reconcile.
 */
export function recordCastTally(praxisId: number, tally: VoteTallyOut): void {
  tallies.set(praxisId, tally)
  emit()
}

/** Drop entries for praxes the server has just told us the truth about. */
export function clearCastTallies(praxisIds: Iterable<number>): void {
  let dropped = false
  for (const praxisId of praxisIds) {
    if (tallies.delete(praxisId)) dropped = true
  }
  if (dropped) emit()
}

/** Pure read — the tally a cast published for this praxis, or null. */
export function castTally(praxisId: number): VoteTallyOut | null {
  return tallies.get(praxisId) ?? null
}

/** Subscribing read for the merge points in useVotedPraxis.ts. */
export function useCastTally(praxisId: number): VoteTallyOut | null {
  const read = () => tallies.get(praxisId) ?? null
  // Third arg is the server snapshot: praxis cards render through
  // renderToStaticMarkup in the archetype tests, and useSyncExternalStore throws
  // without it. Nobody has voted during an SSR pass, so it's always null.
  return useSyncExternalStore(subscribe, read, () => null)
}

/**
 * Test seam only. Six specs isolate through it — see the ratchet in
 * `__tests__/testSeamsStayOutOfTheBundle.test.ts` for why it stays (#2697).
 *
 * KEPT DELIBERATELY, and the audit that flagged it was measuring the wrong
 * thing. Deleting this and `__resetPendingCasts` and rebuilding gives a
 * byte-identical `dist/` — Rollup shakes an export nothing in the application
 * graph imports, so the seam costs zero shipped bytes. What it would have cost
 * to remove is six spec files converted to `vi.resetModules()` plus dynamic
 * re-imports — and three of those reach this map through a DIFFERENT module
 * that holds its own reference to it (`api/praxis.ts` and `api/duel.ts` call
 * `clearCastTallies`; `pendingCasts.ts` calls `recordCastTally`). Each would
 * have to be re-imported in the same breath as this one or it keeps pointing
 * at the old Map, and the isolation silently becomes a no-op that still passes.
 * That is a lot of new ways to be quietly wrong in exchange for zero bytes.
 *
 * The seam is free only while no application module imports it, which the
 * ratchet enforces. Do not re-file this without re-running the build diff.
 */
export function __resetCastTallies(): void {
  tallies.clear()
  emit()
}
