import { useSyncExternalStore } from 'react'
import { castVote, type VoterDetail } from '../../api/votes'
import { recordCastTally } from '../../utils/castTallies'

/**
 * The vote a viewer has CHOSEN, which the server may not have heard yet (#1895).
 * Until the server hears it and a fetch re-reads the roster, the viewer's own
 * row and star are drawn from here.
 *
 * Sending (#3093): each praxis has a window, the ~2s after the latest choice.
 *  - A choice with the window shut and nothing in flight is sent AT ONCE.
 *  - Otherwise it is a change of mind: it restarts the window and is held; the
 *    latest value goes as ONE follow-up when the window shuts.
 *  - Unless the server already has it (the in-flight star, else the last
 *    accepted one): a double-click, or 4-5-4, sends one request.
 * A flush (unmount, navigation) sends what is held but does NOT shut the window,
 * or a remount between quick clicks would make each one a first cast.
 *
 * One request per praxis at a time: a follow-up due mid-flight goes right after
 * the answer, so answers cannot arrive out of order (no sequence number needed).
 *
 * A refusal rolls back only if the refused value is still the one standing; a
 * newer choice is still sent. It does not shut the window, so a viewer with no
 * vote budget cannot send a request per click.
 *
 * Name and star are optimistic; the SCORE is not. It is a server aggregate split
 * across collab members, and copying it here is the drift #1382 deleted. The
 * tally moves only via `recordCastTally` with the POST's own number.
 *
 * Kept beside `castTallies`, not in it: a tally must drop on every praxis read
 * (`clearCastTallies`), while client intent must survive those reads. A query
 * library is more config than code for two entries; revisit on a third write or
 * if any of it must survive a reload.
 *
 * ponytail: entries are never evicted (one small record per praxis voted this
 * session; only the viewer can change it). Ceiling: a vote from another tab is
 * corrected only by reload. To evict, clear from `getVoters`, but only entries
 * neither dirty nor in flight.
 */

/** ~2s (#1895): swallows a quick change of mind; a closed tab loses at most this.
 *  Not "flush on navigate only", which loses the vote to a crash or closed tab. */
const DEBOUNCE_MS = 2_000

type VoterIdentity = Omit<VoterDetail, 'value'>

interface PendingCast {
  /** Optimistic until the flush lands, then the server's `viewer_vote`; null if none stands. */
  value: number | null
  /** Last star the server accepted; where a rejection rolls back to. */
  settled: number | null
  /** Identity for the optimistic row; null when the viewer has no character. */
  voter: VoterIdentity | null
  /** The last flush's rejection, for the control to translate. */
  failure: unknown
  /** A POST is in flight. Serialises requests; disables nothing (see `useVote`). */
  saving: boolean
  dirty: boolean
}

const casts = new Map<number, PendingCast>()
/**
 * `Date.now()` each window shuts. Kept outside the entries: a window shutting is
 * invisible, so it must not re-emit (that re-rendered the whole praxis page).
 *
 * ponytail: wall clock; stepping back holds a window open ~2s longer. Use
 * `performance.now` if seen.
 */
const windowShuts = new Map<number, number>()
const followUps = new Map<number, ReturnType<typeof setTimeout>>()

const inFlight = new Map<number, number>()

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

/** Replace, never mutate: `useSyncExternalStore` compares with `Object.is`. */
function put(praxisId: number, entry: PendingCast): void {
  casts.set(praxisId, entry)
  emit()
}

/** Shown at once; sent at once unless it is a change of mind. */
export function queueCast(
  praxisId: number,
  value: number,
  voter: VoterIdentity | null,
): void {
  const prior = casts.get(praxisId)
  const now = Date.now()
  const changeOfMind = Boolean(prior?.saving) || now < (windowShuts.get(praxisId) ?? 0)
  // A first cast is always sent: `settled` may be older than the server's.
  const alreadyHeard =
    changeOfMind && value === (inFlight.get(praxisId) ?? prior?.settled ?? null)
  cancelFollowUp(praxisId)
  windowShuts.set(praxisId, now + DEBOUNCE_MS)
  put(praxisId, {
    value,
    settled: prior?.settled ?? null,
    voter,
    failure: undefined,
    saving: prior?.saving ?? false,
    dirty: !alreadyHeard,
  })
  if (alreadyHeard) return
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
  inFlight.set(praxisId, value)

  try {
    const cast = await castVote(praxisId, value)
    // The only place the score moves.
    recordCastTally(praxisId, cast.tally)
    const live = casts.get(praxisId)
    if (!live) return
    put(praxisId, {
      ...live,
      saving: false,
      settled: cast.viewer_vote,
      value: live.dirty ? live.value : cast.viewer_vote,
    })
  } catch (failure) {
    const live = casts.get(praxisId)
    if (!live) return
    if (live.dirty) {
      // The refused star was already left; the newer one is still owed.
      put(praxisId, { ...live, saving: false })
    } else {
      // The window stays open, so an immediate retry is held, not sent.
      put(praxisId, {
        ...live,
        saving: false,
        value: live.settled,
        voter: live.settled === null ? null : live.voter,
        failure,
      })
    }
  } finally {
    inFlight.delete(praxisId)
  }
  // A change of mind made mid-flight whose window already shut (or was flushed).
  if (!followUps.has(praxisId)) await send(praxisId)
}

/** The vote control's unmount. */
export function flushPendingCast(praxisId: number): void {
  cancelFollowUp(praxisId)
  void send(praxisId)
}

/** A navigation, for controls that outlive it. */
export function flushPendingCasts(): void {
  for (const praxisId of [...casts.keys()]) flushPendingCast(praxisId)
}

export function pendingCast(praxisId: number): PendingCast | null {
  return casts.get(praxisId) ?? null
}

export function usePendingCast(praxisId: number): PendingCast | null {
  const read = () => casts.get(praxisId) ?? null
  // Server snapshot: required for SSR tests, and always null there.
  return useSyncExternalStore(subscribe, read, () => null)
}

/**
 * The viewer's row inserted at the head (`list_voters` is `created_at DESC`) or
 * updated in place. Returns the SAME array when nothing merges, to avoid churn.
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
 * Test seam only; tree-shaken (see `testSeamsStayOutOfTheBundle.test.ts`, #2697).
 * Not `vi.resetModules()`: that drops the timers without cancelling them.
 */
export function __resetPendingCasts(): void {
  for (const timer of followUps.values()) clearTimeout(timer)
  followUps.clear()
  windowShuts.clear()
  inFlight.clear()
  casts.clear()
  emit()
}
