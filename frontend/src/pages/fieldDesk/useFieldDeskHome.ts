import { useAuth } from '../../auth/AuthContext'
import { useLevelTrack } from '../../hooks/useLevelTrack'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import { rosterOffersAChoice } from '../../hooks/useRosterChoice'
import type { CharacterOut } from '../../api/auth'
import type { PraxisCardOut } from '../../api/praxis'
import type { LevelTrack } from '../../utils/levelTrack'
import { REQUESTS_QUEUE_LINK } from '../updates/requestsQueueAnchor'
import { UPDATES_LINK } from './homeDestinations'

/**
 * Composed read-model for the MOBILE FieldDesk home (#500).
 *
 * Pure composition over the same reads the desktop rail draws from:
 * `useSidebarPanels` for the in-progress tasks and the pending row,
 * `useLevelTrack` for the identity block's progress read-out, and the carried
 * character from auth. No new data logic — it only bundles what those already
 * return, so the mobile skins stay presentation-only and slot-invariant
 * (mirrors `useTaskDetail`, whose `state` every TaskDetail archetype renders).
 *
 * IT NO LONGER CARRIES A VOTE COUNT (#1553). `useVotesReceived` fed a "Votes"
 * stat tile that the identity-block redesign removed — vote count is an input,
 * not an achievement — and this hook was its only consumer, so the
 * `/characters/{id}/stats/votes-received` request left the home screen with it.
 *
 * IT NO LONGER CARRIES `canProposeTask` EITHER (#1554). Owner ruling: `/tasks`
 * is proposing's only home, both form factors. #1556 moved the desktop
 * affordance onto the tasks page (`ProposeTaskLink`, which owns the
 * `can_propose_task` gate) but deliberately left the eight mobile skins linking
 * to `/propose-task` so the control never existed in NEITHER place; taking them
 * out is the other half of that move, and the flag went with them.
 *
 * It used to compose two hooks of its OWN (`useMyActiveTasks` /
 * `usePendingRequests`) that fetched the same two things the rail was fetching,
 * with no cache between them. This hook runs unconditionally while only the
 * mobile skin consumes it, so that put two byte-identical requests on every
 * desktop home load as well. Sharing the rail's one response costs nothing
 * (#1344).
 *
 * Returns `null` when there is no active character — the caller falls back to
 * the desktop roster ("whose shoes today?") so a brand-new account still lands
 * somewhere it can create a life.
 */
export interface FieldDeskHomeState {
  /** The carried life — guaranteed non-null (the hook returns null otherwise). */
  character: CharacterOut
  /** Current era label from /auth/me (e.g. "Era 3"); '' when unknown. */
  eraName: string
  /** Progress toward the next level; `null` until the era config lands. */
  levelTrack: LevelTrack | null
  /** In-progress praxes (membership-scoped) — the active-tasks list. */
  activeTasks: PraxisCardOut[]
  /**
   * The summary row under the identity card, or `null` while the panels are
   * still in flight. See {@link selectPendingRow}.
   */
  pendingRow: PendingRowState | null
  /** Whether the active-tasks list is still loading. */
  loadingTasks: boolean
  /**
   * Has the account got a character choice worth opening a sheet for? (#2111)
   *
   * Drives the `CHARACTERS` trigger on every skin's identity block: with one
   * life and a shut second-character gate the sheet holds nothing but the life
   * already being carried, so the trigger is hidden rather than shown dead.
   * `rosterOffersAChoice` is the rule and the desktop roster reads the same
   * one, so the two surfaces cannot disagree.
   */
  offersACharacterChoice: boolean
}

/**
 * What the row under the identity card is *saying*, which is not always the same
 * as what it is *offering* (#1554).
 *
 * Three states, and the third is the one worth naming in a type: with nothing
 * waiting the row stays on screen and stops being a control at all. A dead-ended
 * pill that still looks pressable is worse than no pill, so `to === null` is the
 * skins' single instruction to drop the link, the chevron and the press state
 * together — not to grey one out.
 *
 * `'notifications'` is the wire field's historical name (`global_activity`),
 * NOT what the row says: since #2083 that state speaks as ACTIVITY — a log of
 * events — because the bell beside it is the queue of things awaiting an
 * answer, and neither used to say which it was. `PendingRowPill.activityLabel`
 * holds the copy and the argument.
 */
type PendingRowKind = 'requests' | 'notifications' | 'clear'

export interface PendingRowState {
  kind: PendingRowKind
  /**
   * Interpolated into the copy: outstanding requests on `'requests'`, waiting
   * news on `'notifications'`. Always 0 on `'clear'`.
   *
   * ZERO ON `'notifications'` MEANS "NO NUMBER", not "no news" — that state is
   * only reachable with news waiting. It is the deploy-skew case: a client
   * ahead of its API gets no `global_activity_count` and the pill falls back to
   * wording that needs none. See {@link selectPendingRow}.
   */
  count: number
  /** Where the row leads, or `null` when it is a statement rather than a control. */
  to: string | null
}

/** The news side of `/me/sidebar`, which reports it twice over. */
interface NewsWaiting {
  /**
   * `global_activity_count` — how many items there are. `undefined` only under
   * deploy skew, when the API predates the field (#1587).
   */
  total: number | undefined
  /** `global_activity.length` — the five-item glance, so at most 5. */
  glanced: number
}

/**
 * Which of the three the row is in.
 *
 * OBLIGATIONS OUTRANK NEWS, and they are disjoint sets rather than a priority
 * fudge: ADR-0070 partitions the feed so an unanswered request lives in the
 * queue and never in the stream, which is why `otherActivity` here is already
 * "everything that is not a request" without this function subtracting anything.
 * `pending_requests_count` counts the queue side, `global_activity` carries the
 * stream side, and both come out of `_visible_types` on the same `/me/sidebar`
 * response — so the two states cannot double-count one item or lose one.
 *
 * `loading` returns `null` rather than falling through to 'clear'. Before the
 * panels land both numbers are zero, and zero-because-unknown would render "All
 * caught up" over a queue with four invites in it, then swap under the reader a
 * moment later. A row that appears late is honest; a row that lies briefly is not.
 *
 * THE NOTIFICATIONS STATE CARRIES ITS NUMBER (#1587), from
 * `global_activity_count` and never from `global_activity.length`. The list is a
 * five-item glance (`SIDEBAR_ACTIVITY_LIMIT`), so its length would read "5" for a
 * player with fifty — the badge-disagrees-with-the-list drift ADR-0036 exists to
 * prevent. The count field is the server's own pre-slice length, from the same
 * fetch, and it costs no extra query. `PendingRowPill` caps it honestly at
 * `ACTIVITY_COUNT_CAP`, above which it is a floor rather than a total.
 *
 * The glance length is still read, for PRESENCE only: under deploy skew a client
 * ahead of its API gets no count at all, and a non-empty glance is then the only
 * proof there is news. `total: undefined` reaches the pill as `count: 0` — the
 * row still leads to `/updates`, it just says "New activity" — the numberless
 * wording, true at any volume — rather than rendering `undefined`.
 */
export function selectPendingRow(
  pendingRequests: number,
  news: NewsWaiting,
  loading: boolean,
): PendingRowState | null {
  if (loading) return null
  if (pendingRequests > 0) {
    return { kind: 'requests', count: pendingRequests, to: REQUESTS_QUEUE_LINK }
  }
  if ((news.total ?? news.glanced) > 0) {
    return { kind: 'notifications', count: news.total ?? 0, to: UPDATES_LINK }
  }
  return { kind: 'clear', count: 0, to: null }
}

/**
 * `lives` is the ACCOUNT'S ROSTER, passed in rather than read here (#2111).
 *
 * The page already holds it — the desktop branch draws the roster cards from
 * it — and it is needed for exactly one thing on this side: whether the
 * `CHARACTERS` trigger has a choice to offer. Reading it again here would put a
 * second byte-identical `/me/characters` on every home load, which is the cost
 * this hook was written to remove. `null` while the read is in flight.
 */
export function useFieldDeskHome(lives: CharacterOut[] | null): FieldDeskHomeState | null {
  const { user } = useAuth()
  const character = user?.character ?? null

  // Hooks run unconditionally (React rules); a null character just means the
  // downstream values are their empty defaults and we return null below.
  const {
    active_praxes: activeTasks,
    pending_requests_count: pendingCount,
    // The wire field is still named `global_activity`; since #1556 it carries
    // the whole live feed minus the obligations, which is precisely the
    // "notifications that are not requests" side of the row.
    global_activity: recentActivity,
    global_activity_count: activityCount,
    loading: loadingTasks,
  } = useSidebarPanels()
  const track = useLevelTrack(character?.level ?? 0, character?.score ?? 0)

  if (!character) return null

  return {
    character,
    eraName: user?.era_name ?? '',
    levelTrack: track,
    activeTasks,
    pendingRow: selectPendingRow(
      pendingCount,
      { total: activityCount, glanced: recentActivity.length },
      loadingTasks,
    ),
    loadingTasks,
    // A carried life is guaranteed here (the early return above), so only the
    // gate and the count are left to ask.
    offersACharacterChoice: rosterOffersAChoice(
      lives,
      true,
      user?.can_create_additional_character ?? false,
    ),
  }
}
