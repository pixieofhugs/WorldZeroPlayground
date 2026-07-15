import { useAuth } from '../../auth/AuthContext'
import { useMyActiveTasks } from '../../hooks/useMyActiveTasks'
import { useMyCharacterStats } from '../../hooks/useMyCharacterStats'
import { usePendingRequests } from '../../hooks/usePendingRequests'
import type { CharacterOut } from '../../api/auth'
import type { PraxisCardOut } from '../../api/praxis'

/**
 * Composed read-model for the MOBILE FieldDesk home (#500).
 *
 * Pure composition over the existing home hooks — the same three the desktop
 * Sidebar consumes (`useMyActiveTasks` / `useMyCharacterStats` /
 * `usePendingRequests`) plus the carried character from auth. No new data
 * logic: it only bundles what those hooks already return so the mobile skins
 * can stay presentation-only and slot-invariant (mirrors `useTaskDetail`, whose
 * `state` every TaskDetail archetype renders).
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
  /** Count of pending collab invites + duel challenges. */
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
  const { activeTasks, loading: loadingTasks } = useMyActiveTasks()
  const { votesReceived } = useMyCharacterStats(character?.id)
  const { pendingRequests } = usePendingRequests()

  if (!character) return null

  return {
    character,
    eraName: user?.era_name ?? '',
    votesReceived,
    activeTasks,
    pendingCount: pendingRequests.length,
    loadingTasks,
    canProposeTask: user?.can_propose_task ?? false,
  }
}
