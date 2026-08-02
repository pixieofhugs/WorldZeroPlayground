import { useAuth } from '../../auth/AuthContext'
import { useLevelTrack } from '../../hooks/useLevelTrack'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
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
 */
export type PendingRowKind = 'requests' | 'notifications' | 'clear'

export interface PendingRowState {
  kind: PendingRowKind
  /** Interpolated into the requests copy; 0 for the other two kinds. */
  count: number
  /** Where the row leads, or `null` when it is a statement rather than a control. */
  to: string | null
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
 * THE NOTIFICATIONS STATE CARRIES NO NUMBER, and that is a deliberate shortfall
 * against the design's `N notifications` — see the copy key's note. `/me/sidebar`
 * sends the activity panel as a five-item glance (`SIDEBAR_ACTIVITY_LIMIT`), not
 * a count, so the only number available here is a display cap that would read
 * "5" for a player with fifty. Restoring the number needs a real count field on
 * that response; approximating it from the list length would be exactly the
 * badge-disagrees-with-the-list drift ADR-0036 exists to prevent.
 */
export function selectPendingRow(
  pendingRequests: number,
  otherActivity: number,
  loading: boolean,
): PendingRowState | null {
  if (loading) return null
  if (pendingRequests > 0) {
    return { kind: 'requests', count: pendingRequests, to: REQUESTS_QUEUE_LINK }
  }
  if (otherActivity > 0) return { kind: 'notifications', count: 0, to: UPDATES_LINK }
  return { kind: 'clear', count: 0, to: null }
}

export function useFieldDeskHome(): FieldDeskHomeState | null {
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
    loading: loadingTasks,
  } = useSidebarPanels()
  const track = useLevelTrack(character?.level ?? 0, character?.score ?? 0)

  if (!character) return null

  return {
    character,
    eraName: user?.era_name ?? '',
    levelTrack: track,
    activeTasks,
    pendingRow: selectPendingRow(pendingCount, recentActivity.length, loadingTasks),
    loadingTasks,
  }
}
