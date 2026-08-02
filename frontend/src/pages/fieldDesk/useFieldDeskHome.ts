import { useAuth } from '../../auth/AuthContext'
import { useLevelTrack } from '../../hooks/useLevelTrack'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import type { CharacterOut } from '../../api/auth'
import type { PraxisCardOut } from '../../api/praxis'
import type { LevelTrack } from '../../utils/levelTrack'

/**
 * Composed read-model for the MOBILE FieldDesk home (#500).
 *
 * Pure composition over the same reads the desktop rail draws from:
 * `useSidebarPanels` for the in-progress tasks and the pending-request count,
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
  /** Count of unanswered requests, straight from `/me/sidebar` (#1456). */
  pendingCount: number
  /** Whether the active-tasks list is still loading. */
  loadingTasks: boolean
  /** Server-computed: may this life propose a task (drives the secondary CTA)? */
  canProposeTask: boolean
}

export function useFieldDeskHome(): FieldDeskHomeState | null {
  const { user } = useAuth()
  const character = user?.character ?? null

  // Hooks run unconditionally (React rules); a null character just means the
  // downstream values are their empty defaults and we return null below.
  const {
    active_praxes: activeTasks,
    pending_requests_count: pendingCount,
    loading: loadingTasks,
  } = useSidebarPanels()
  const track = useLevelTrack(character?.level ?? 0, character?.score ?? 0)

  if (!character) return null

  return {
    character,
    eraName: user?.era_name ?? '',
    levelTrack: track,
    activeTasks,
    pendingCount,
    loadingTasks,
    canProposeTask: user?.can_propose_task ?? false,
  }
}
