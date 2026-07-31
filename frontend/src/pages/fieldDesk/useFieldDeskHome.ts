import { useAuth } from '../../auth/AuthContext'
import { useMyCharacterStats } from '../../hooks/useMyCharacterStats'
import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import type { CharacterOut } from '../../api/auth'
import type { PraxisCardOut } from '../../api/praxis'

/**
 * Composed read-model for the MOBILE FieldDesk home (#500).
 *
 * Pure composition over the same reads the desktop rail draws from:
 * `useSidebarPanels` for the in-progress tasks and the pending-request count,
 * `useMyCharacterStats` for the votes tile, and the carried character from
 * auth. No new data logic — it only bundles what those already return, so the
 * mobile skins stay presentation-only and slot-invariant (mirrors
 * `useTaskDetail`, whose `state` every TaskDetail archetype renders).
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
  /** Votes this life has received (the "Votes" stat tile). */
  votesReceived: number
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
  const { votesReceived } = useMyCharacterStats(character?.id)

  if (!character) return null

  return {
    character,
    eraName: user?.era_name ?? '',
    votesReceived,
    activeTasks,
    pendingCount,
    loadingTasks,
    canProposeTask: user?.can_propose_task ?? false,
  }
}
