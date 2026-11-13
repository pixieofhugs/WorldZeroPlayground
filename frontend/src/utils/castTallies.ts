import type { VoteTallyOut } from '../api/votes'

/**
 * The server tally a cast just returned, keyed by praxis id, until a later read
 * supersedes it (#1382). A store because the tally is drawn by siblings `useVote`
 * cannot reach, including a duel's rival side (#1239). Entries are truth, not
 * deltas; one kept past the next read would mask another player's vote.
 * React-free, so it lives in `utils/` (#2893); the hook is
 * `components/vote/castTallies.ts`.
 *
 * ponytail: not a general query cache. `components/vote/pendingCasts.ts` is the
 * second small store (opposite lifecycle, #1895); revisit at a third.
 */

/** `at`: the `clock` value when the cast was answered. See `castTallyClock`. */
const tallies = new Map<number, { tally: VoteTallyOut; at: number }>()
let clock = 0
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Subscribing read for `useCastTally` in `components/vote/castTallies.ts`. */
export function subscribeCastTallies(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Publish the tally a cast returned; last write wins. */
export function recordCastTally(praxisId: number, tally: VoteTallyOut): void {
  clock += 1
  tallies.set(praxisId, { tally, at: clock })
  emit()
}

/**
 * Take BEFORE issuing a read and pass to `clearCastTallies` when it resolves
 * (#3093): a read in flight when a cast lands may predate the vote. Same shape
 * as `CacheEpoch.version()`, but a separate counter (that one drops everything).
 */
export function castTallyClock(): number {
  return clock
}

/**
 * Drop entries for praxes a read just returned truth for. Hand-fired (#2892):
 * keyed on ids in a response body, which the transport cannot see. Callers:
 * `listPraxes`, `getPraxis`, `getDuelDetail`; a fourth means a shared
 * `reconcileTallies` in `api/`. Tallies newer than `readStartedAt` are kept.
 */
export function clearCastTallies(praxisIds: Iterable<number>, readStartedAt: number): void {
  let dropped = false
  for (const praxisId of praxisIds) {
    const entry = tallies.get(praxisId)
    if (entry && entry.at <= readStartedAt && tallies.delete(praxisId)) dropped = true
  }
  if (dropped) emit()
}

/** Pure read — the tally a cast published for this praxis, or null. */
export function castTally(praxisId: number): VoteTallyOut | null {
  return tallies.get(praxisId)?.tally ?? null
}

/**
 * Test seam only (#2697). Tree-shaken, so zero shipped bytes while no app module
 * imports it, which `testSeamsStayOutOfTheBundle.test.ts` enforces;
 * `vi.resetModules()` instead would silently miss modules holding this Map.
 */
export function __resetCastTallies(): void {
  tallies.clear()
  emit()
}
