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
 * Composed read-model for the MOBILE FieldDesk home (#500): bundles the rail's
 * own reads (`useSidebarPanels`, `useLevelTrack`, auth) so skins stay
 * presentation-only. Shares the rail's response rather than refetching: the hook
 * runs on desktop too (#1344).
 *
 * Returns `null` with no active character; the caller falls back to the roster.
 */
export interface FieldDeskHomeState {
  character: CharacterOut
  /** Current era label from /auth/me (e.g. "Era 3"); '' when unknown. */
  eraName: string
  /** Progress toward the next level; `null` until the era config lands. */
  levelTrack: LevelTrack | null
  /** In-progress praxes (membership-scoped). */
  activeTasks: PraxisCardOut[]
  /** `null` while the panels are in flight; see {@link selectPendingRow}. */
  pendingRow: PendingRowState | null
  loadingTasks: boolean
  /** Hides the CHARACTERS trigger when the sheet has no choice (#2111); same
   *  `rosterOffersAChoice` rule as the desktop roster. */
  offersACharacterChoice: boolean
  /** Hides "Cast Your Votes" below the vote level (#3133). Only an explicit
   *  `can_vote: false` withholds it (a stale cached `/auth/me` lacks the field),
   *  same as `VoteUI`. */
  canVote: boolean
}

/**
 * What the row under the identity card says (#1554). On `'clear'` it is not a
 * control: `to === null` tells skins to drop link, chevron and press state.
 * `'notifications'` is the wire name; the row speaks as ACTIVITY (#2083, see
 * `PendingRowPill.activityLabel`).
 */
type PendingRowKind = 'requests' | 'notifications' | 'clear'

export interface PendingRowState {
  kind: PendingRowKind
  /**
   * Requests or waiting news; 0 on `'clear'`. 0 on `'notifications'` means "no
   * number" (deploy skew: no `global_activity_count`), not "no news".
   */
  count: number
  to: string | null
}

/** The news side of `/me/sidebar`, which reports it twice over. */
interface NewsWaiting {
  /** `global_activity_count`; `undefined` only under deploy skew (#1587). */
  total: number | undefined
  /** `global_activity.length` — the five-item glance, so at most 5. */
  glanced: number
}

/**
 * Obligations outrank news; the sets are disjoint (ADR-0070), so nothing is
 * double-counted. `loading` returns `null`, not 'clear': unknown zeros would
 * flash "All caught up" over a full queue.
 *
 * The count comes from `global_activity_count` (#1587), never the 5-item glance's
 * length (ADR-0036). The glance is read only for presence under deploy skew,
 * where the row falls back to numberless wording via `count: 0`.
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

/** `lives` is the page's roster, passed in to avoid a second `/me/characters`
 *  fetch (#2111); `null` while in flight. */
export function useFieldDeskHome(lives: CharacterOut[] | null): FieldDeskHomeState | null {
  const { user } = useAuth()
  const character = user?.character ?? null

  const {
    active_praxes: activeTasks,
    pending_requests_count: pendingCount,
    // Since #1556: the live feed minus obligations.
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
    offersACharacterChoice: rosterOffersAChoice(
      lives,
      true,
      user?.can_create_additional_character ?? false,
    ),
    canVote: user?.can_vote !== false,
  }
}
