import { useSyncExternalStore } from 'react'
import { castVote, type VoterDetail } from '../../api/votes'
import { recordCastTally } from '../../utils/castTallies'

/**
 * The vote a viewer has CHOSEN, which the server may not have heard yet (#1895).
 *
 * Two things at once, because they are one mechanism. A change of mind is
 * deferred ~2s so three of them cost one POST; and until the server has heard
 * the latest choice — and until a fetch re-reads the roster — the viewer's own
 * row and star are drawn from here instead of from the server.
 *
 * WHEN A CAST IS SENT (#3093, amending ruling 1 of #1895, which debounced every
 * cast). Each praxis has a WINDOW: the ~2s after the viewer's most recent
 * choice on it, which every further choice restarts.
 *
 *  - A choice made with the window shut and nothing in flight is sent AT ONCE,
 *    and opens the window. That is the first star, and it is why the total now
 *    repaints one round trip after it rather than two seconds and a round trip.
 *  - A choice made with the window open, or with a request in flight, is a
 *    change of mind: it restarts the window and is HELD. When the window
 *    shuts, the latest value goes as ONE follow-up, however many choices were
 *    made in it.
 *  - The praxis is back to "sent at once" when the window has shut and no
 *    request is in flight — that is the whole of "shortly after".
 *
 * The window and the held follow-up are two things, kept apart below
 * (`windowShuts`, `followUps`). A flush (unmount, navigation) sends what is
 * held without waiting, but does NOT shut the window: only time does. A
 * control that remounts between two quick clicks would otherwise forget the
 * first and send every later click as a first cast.
 *
 * The accepted cost, stated when it was ruled: a viewer who changes their mind
 * sends two requests instead of one.
 *
 * ONE REQUEST PER PRAXIS AT A TIME. A follow-up that falls due while a request
 * is still out waits for the answer and goes straight after it. Two requests
 * are never in the air together, so there is no order for their answers to
 * arrive out of: the last tally recorded is always the answer to the last
 * value sent. No sequence number, because there is nothing to sequence.
 *
 * A REFUSAL ROLLS BACK ONLY THE LATEST CHOICE. If the viewer has moved on while
 * the refused request was out, the newer star is still what they want: it is
 * sent as the follow-up it already was, and the refusal of a star they have
 * left is not shown. The star rolls back when the value refused is the one
 * standing.
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
 *    survive exactly those reads: a background praxis fetch during the window
 *    would otherwise erase a vote the player can see themselves casting.
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

/** The window: long enough to swallow a rapid change of mind; short enough that
 *  a closed tab loses at most this of one. Ruled at ~2s in #1895 — NOT "flush
 *  on navigate only", which loses the vote to a crash, dead wifi or a closed
 *  tab. Since #3093 it holds back only a change of mind, never a first cast. */
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
  /** A POST is in flight. Serialises requests; disables nothing (see `useVote`). */
  saving: boolean
  /** `value` has not reached the server yet. */
  dirty: boolean
}

const casts = new Map<number, PendingCast>()
/**
 * When each praxis's window shuts, as a `Date.now()`. A choice before then is a
 * change of mind. Outside the entries on purpose: a window shutting changes
 * nothing a viewer can see, so it must not re-emit (it used to, re-rendering
 * the whole praxis page two seconds after every lone vote).
 *
 * ponytail: wall clock, so a system clock stepping backwards holds a window
 * open longer. The cost is a first star that waits ~2s, once. `performance.now`
 * if that is ever seen.
 */
const windowShuts = new Map<number, number>()
/** The timer that will send a held change of mind when its window shuts. */
const followUps = new Map<number, ReturnType<typeof setTimeout>>()

/** Stop waiting on the window: whatever is held is sent by the caller, or not at all. */
function cancelFollowUp(praxisId: number): void {
  clearTimeout(followUps.get(praxisId))
  followUps.delete(praxisId)
}

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
 * The viewer has picked a star. Shown immediately; sent immediately too unless
 * it is a change of mind, which waits for the mind-changing to stop.
 */
export function queueCast(
  praxisId: number,
  value: number,
  voter: VoterIdentity | null,
): void {
  const prior = casts.get(praxisId)
  const now = Date.now()
  const changeOfMind = Boolean(prior?.saving) || now < (windowShuts.get(praxisId) ?? 0)
  cancelFollowUp(praxisId)
  windowShuts.set(praxisId, now + DEBOUNCE_MS)
  put(praxisId, {
    value,
    settled: prior?.settled ?? null,
    voter,
    failure: undefined,
    saving: prior?.saving ?? false,
    dirty: true,
  })
  if (!changeOfMind) {
    void send(praxisId)
    return
  }
  followUps.set(
    praxisId,
    setTimeout(() => {
      followUps.delete(praxisId)
      void send(praxisId)
    }, DEBOUNCE_MS),
  )
}

async function send(praxisId: number): Promise<void> {
  const entry = casts.get(praxisId)
  if (!entry || !entry.dirty || entry.saving || entry.value === null) return
  const value = entry.value
  put(praxisId, { ...entry, dirty: false, saving: true })

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
  } catch (failure) {
    const live = casts.get(praxisId)
    if (!live) return
    if (live.dirty) {
      // The viewer has already left the star that was refused. The newer one
      // is still owed, and its own answer is the one they should hear.
      put(praxisId, { ...live, saving: false })
    } else {
      // Rollback: back to the last star the server accepted, which is nothing
      // at all on a first cast. The control reads `failure` and says why. The
      // window shuts with it, so trying again is sent at once.
      windowShuts.delete(praxisId)
      put(praxisId, {
        ...live,
        saving: false,
        value: live.settled,
        voter: live.settled === null ? null : live.voter,
        failure,
      })
    }
  }
  // A change of mind made while this was out. If a follow-up is still waiting
  // on its window, that will send it; if the window shut (or a flush gave up
  // the wait) while we were out, it is owed now. A no-op when nothing is held.
  if (!followUps.has(praxisId)) await send(praxisId)
}

/** Send this praxis's held vote now — the vote control's unmount. */
export function flushPendingCast(praxisId: number): void {
  cancelFollowUp(praxisId)
  void send(praxisId)
}

/** Send every held vote now — a navigation, for controls that outlive it. */
export function flushPendingCasts(): void {
  for (const praxisId of [...casts.keys()]) flushPendingCast(praxisId)
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
 * `clearTimeout` loop below is the point of the function, and the suggested
 * replacement — `vi.resetModules()` — drops the module's reference to those
 * handles WITHOUT cancelling them, so a spec that leaves a cast pending would
 * fire a timer into a torn-down module. Cancelling the timers is a thing only
 * code holding this map can do.
 */
export function __resetPendingCasts(): void {
  for (const timer of followUps.values()) clearTimeout(timer)
  followUps.clear()
  windowShuts.clear()
  casts.clear()
  emit()
}
