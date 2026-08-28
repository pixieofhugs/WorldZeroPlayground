import { useSyncExternalStore } from 'react'
import { castVote, type VoterDetail } from '../../api/votes'
import { recordCastTally } from './castTallies'

/**
 * The vote a viewer has CHOSEN, which the server may not have heard yet (#1895).
 *
 * Two things at once, because they are one mechanism. A cast is deferred ~2s so
 * three mind-changes cost one POST; and for those seconds — and until a fetch
 * re-reads the roster — the viewer's own row and star are drawn from here
 * instead of from the server.
 *
 * WHAT MAY BE OPTIMISTIC, AND WHAT MAY NOT. The viewer's name and the star they
 * picked are facts this client already owns, so it may show them at once. The
 * SCORE is not: `points_from_votes` is a server aggregate that
 * `_resolve_card_scoring` then splits across collab members by contribution, and
 * reproducing that here is exactly the arithmetic #1382 spent a refactor
 * deleting (#1142 and #1239 were both that arithmetic drifting between copies).
 * So nothing in this file computes a score. The tally moves only when the POST
 * answers, and only by handing the server's own number to `recordCastTally`.
 *
 * BESIDE `castTallies`, NOT INSIDE IT — the decision #1895 asked for out loud.
 * That store's ponytail note says to reach for a real query cache if a second
 * write ever needs the same treatment. This is the second write and it is still
 * not that, for two reasons:
 *
 *  - It needs the OPPOSITE lifecycle. A cast tally is server truth that must be
 *    dropped the moment a fetch supersedes it, which is why `clearCastTallies`
 *    is called from the api layer on every praxis read. Client intent must
 *    survive exactly those reads: a background praxis fetch during the 2s
 *    window would otherwise erase a vote the player can see themselves casting.
 *    Sharing one map would mean one clear rule serving two opposite needs.
 *  - A query library buys cache keys, invalidation and refetch policy. We have
 *    two entries, no key space and no refetch — it would be more configuration
 *    than code. Revisit when a THIRD write wants this, or when any of it needs
 *    to survive a reload.
 *
 * ponytail: entries are never evicted. That is deliberate rather than lazy — an
 * entry is a fact about the viewer's OWN vote, which no other player can
 * change, so unlike a tally it cannot go stale in a way that misleads. The
 * ceiling: a vote cast in a second tab, or a praxis reopened out from under it,
 * is only corrected by a reload. The map holds one small record per praxis the
 * viewer voted on this session and is gone on reload. If eviction is ever
 * wanted, clear from `getVoters` — but only for entries that are neither dirty
 * nor in flight, or the clear will race the window it is supposed to outlive.
 */

/** Long enough to swallow a rapid change of mind; short enough that a closed
 *  tab loses at most this. Ruled at ~2s in #1895 — NOT "flush on navigate
 *  only", which loses the vote to a crash, dead wifi or a closed tab. */
const DEBOUNCE_MS = 2_000

/** Who the viewer is, for the row we draw before the server draws it. */
type VoterIdentity = Omit<VoterDetail, 'value'>

interface PendingCast {
  /**
   * The star that stands for this viewer: optimistic until the flush lands,
   * then the server's own `viewer_vote`. Null when there is nothing to show —
   * either a rejection rolled it back past any accepted value, or none was ever
   * accepted.
   */
  value: number | null
  /** The last star the server accepted, i.e. where a rejection rolls back to. */
  settled: number | null
  /** Identity for the optimistic row; null when the viewer has no character. */
  voter: VoterIdentity | null
  /** Whatever the last flush was rejected with, for the control to translate. */
  failure: unknown
  /** A POST is in flight — the only window the control is disabled for. */
  saving: boolean
  /** `value` has not reached the server yet. */
  dirty: boolean
  /** The pending debounce, cleared by the next choice or by a flush. */
  timer: ReturnType<typeof setTimeout> | null
}

const casts = new Map<number, PendingCast>()
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
 * Entries are REPLACED, never mutated in place: `useSyncExternalStore` compares
 * snapshots with `Object.is`, so a mutated record would be the same reference
 * and no vote would ever repaint.
 */
function put(praxisId: number, entry: PendingCast): void {
  casts.set(praxisId, entry)
  emit()
}

/**
 * The viewer has picked a star. Shown immediately, sent once the mind-changing
 * stops.
 */
export function queueCast(
  praxisId: number,
  value: number,
  voter: VoterIdentity | null,
): void {
  const prior = casts.get(praxisId)
  if (prior?.timer) clearTimeout(prior.timer)
  put(praxisId, {
    value,
    settled: prior?.settled ?? null,
    voter,
    failure: undefined,
    saving: prior?.saving ?? false,
    dirty: true,
    timer: setTimeout(() => void send(praxisId), DEBOUNCE_MS),
  })
}

async function send(praxisId: number): Promise<void> {
  const entry = casts.get(praxisId)
  if (!entry || !entry.dirty || entry.saving || entry.value === null) return
  if (entry.timer) clearTimeout(entry.timer)
  const value = entry.value
  put(praxisId, { ...entry, dirty: false, saving: true, timer: null })

  try {
    const cast = await castVote(praxisId, value)
    // The score moves HERE and only here — the server's own post-write tally.
    recordCastTally(praxisId, cast.tally)
    const live = casts.get(praxisId)
    if (!live) return
    put(praxisId, {
      ...live,
      saving: false,
      settled: cast.viewer_vote,
      // The server's word on which star stands, unless the viewer has already
      // moved past it while the request was out.
      value: live.dirty ? live.value : cast.viewer_vote,
    })
    if (live.dirty) await send(praxisId)
  } catch (failure) {
    // Rollback: back to the last star the server accepted, which is nothing at
    // all on a first cast. The control reads `failure` and says why.
    const live = casts.get(praxisId)
    if (!live) return
    put(praxisId, {
      ...live,
      saving: false,
      dirty: false,
      timer: null,
      value: live.settled,
      voter: live.settled === null ? null : live.voter,
      failure,
    })
  }
}

/** Send this praxis's queued vote now — the vote control's unmount. */
export function flushPendingCast(praxisId: number): void {
  void send(praxisId)
}

/** Send every queued vote now — a navigation, for controls that outlive it. */
export function flushPendingCasts(): void {
  for (const praxisId of [...casts.keys()]) void send(praxisId)
}

/** Pure read. */
export function pendingCast(praxisId: number): PendingCast | null {
  return casts.get(praxisId) ?? null
}

/** Subscribing read for the vote control and the voters panel. */
export function usePendingCast(praxisId: number): PendingCast | null {
  const read = () => casts.get(praxisId) ?? null
  // Third arg is the server snapshot: vote controls render through
  // renderToStaticMarkup in the archetype tests, and useSyncExternalStore
  // throws without it. Nobody has voted during an SSR pass, so it's always null.
  return useSyncExternalStore(subscribe, read, () => null)
}

/**
 * The voters list with the viewer's own row moved — inserted at the head where
 * `list_voters` (`Vote.created_at DESC`) would put a new vote, or updated in
 * place when they are already on it. Re-voting is the common case, so the
 * update path is the one that runs most.
 *
 * Returns the SAME array when there is nothing to merge, so a page that reads
 * it every render does not churn.
 */
export function applyPendingCast(
  voters: VoterDetail[],
  pending: PendingCast | null,
): VoterDetail[] {
  if (!pending || pending.value === null || !pending.voter) return voters
  const row: VoterDetail = { ...pending.voter, value: pending.value }
  const index = voters.findIndex((voter) => voter.character_id === row.character_id)
  if (index === -1) return [row, ...voters]
  const merged = voters.slice()
  merged[index] = row
  return merged
}

/**
 * Test seam only. One spec isolates through it — see the ratchet in
 * `__tests__/testSeamsStayOutOfTheBundle.test.ts` for why it stays (#2697).
 *
 * KEPT DELIBERATELY, on the same evidence as `__resetCastTallies`: removing
 * both leaves `dist/` byte-identical, so neither ships. This one also has a
 * hazard its sibling does not, which is the second reason it stayed. The
 * `clearTimeout` loop above is the point of the function, and the suggested
 * replacement — `vi.resetModules()` — drops the module's reference to those
 * handles WITHOUT cancelling them, so a spec that leaves a cast pending would
 * fire a timer into a torn-down module. Cancelling the timers is a thing only
 * code holding this map can do.
 */
export function __resetPendingCasts(): void {
  for (const entry of casts.values()) if (entry.timer) clearTimeout(entry.timer)
  casts.clear()
  emit()
}
