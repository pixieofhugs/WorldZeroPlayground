import api from './axios'
import { clearVoteOverrides } from '../components/vote/voteOverrides'
import type { TaskOut } from './tasks'
import type { FlagReason } from '../utils/flagReasons'

// ---------------------------------------------------------------------------
// Types — match backend schemas/praxis.py exactly
// ---------------------------------------------------------------------------

export type PraxisType = 'solo' | 'collab' | 'duel'
export type PraxisStatus = 'in_progress' | 'pending' | 'submitted'
export type PraxisInviteStatus = 'pending' | 'accepted' | 'declined'
export type ModerationStatus = 'visible' | 'flagged' | 'hidden' | 'failed'
export type MediaType = 'image' | 'video' | 'audio'

export interface MediaItemOut {
  id: number
  praxis_id: number
  type: MediaType
  file_path: string
  display_order: number
  created_at: string
}

export interface PraxisMemberOut {
  id: number
  praxis_id: number
  character_id: number
  character_display_name: string
  has_submitted: boolean
  joined_at: string
}

export interface PraxisInviteOut {
  id: number
  praxis_id: number
  inviter_id: number
  invitee_id: number
  inviter_display_name: string
  invitee_display_name: string
  status: PraxisInviteStatus
  created_at: string
}

export interface PraxisOut {
  id: number
  task_id: number
  task_title: string
  task_point_value: number
  task_level_required: number
  task_faction_slug: string | null
  type: PraxisType
  status: PraxisStatus
  title: string | null
  body_text: string | null
  moderation_status: ModerationStatus
  admin_note: string | null
  flagged_at: string | null
  submitted_at: string | null
  /** When a collab's pending-publish window opened; null if not pending (ADR-0012). */
  submit_proposed_at: string | null
  created_by_id: number
  created_by_display_name: string
  created_by_faction_slug: string | null
  created_at: string
  updated_at: string
  members: PraxisMemberOut[]
  invites: PraxisInviteOut[]
  media_items: MediaItemOut[]
  // The one authoritative number for this praxis (ADR-0053), computed for its
  // AUTHOR for every type including collab, with the terms behind it:
  //   score = (task_point_value + metatask_points) × display_multiplier
  //           + points_from_votes
  /** The computed total. Never derive its parts by subtraction — read the terms. */
  score: number
  /** Points contributed by applied metatasks; the meta row shows only when > 0. */
  metatask_points: number
  /** faction × duel collapsed into one value; `1.0` hides the mult row. */
  display_multiplier: number
  /** Points scored from votes (`+0` is valid — the votes row always shows). */
  points_from_votes: number
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean
  /** Set when this praxis is one side of a duel (ADR-0011). */
  duel_id: number | null
  can_flag: boolean
  applied_metatasks: TaskOut[]
}

export interface PraxisCardOut {
  id: number
  task_id: number
  task_title: string
  task_point_value: number
  task_level_required: number
  type: PraxisType
  status: PraxisStatus
  title: string | null
  moderation_status: ModerationStatus
  created_by_id: number
  created_by_display_name: string
  /**
   * The author's portrait for the card byline (#888). `""` when they have none
   * — the byline falls back to the shared monogram avatar. Optional so a stale
   * cached payload degrades to the monogram rather than crashing the card.
   */
  created_by_avatar_url?: string
  created_at: string
  updated_at: string
  submitted_at: string | null
  /**
   * When a collab's pending-publish window opened; null/absent if not pending
   * (ADR-0012). Optional because the list schema may omit it — the pending chip
   * simply doesn't render until it's present.
   */
  submit_proposed_at?: string | null
  member_count: number
  // The computed total and the terms behind it (ADR-0053, supersedes ADR-0047),
  // resolved for the praxis AUTHOR for every type including collab:
  //   score = (task_point_value + metatask_points) × display_multiplier
  //           + points_from_votes
  // "Merit" (base + votes, multipliers discarded) is retired, and nothing
  // derives vote-points or a multiplier by subtraction.
  /** The computed total — the stamp headline, shown to 1 decimal. */
  score: number
  voter_count: number
  /** Points contributed by applied metatasks; the meta row shows only when > 0. */
  metatask_points: number
  /** faction × duel collapsed into one value; `1.0` hides the mult row. */
  display_multiplier: number
  /** Points scored from votes (`+0` is valid — the votes row always shows). */
  points_from_votes: number
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean
  task_faction_slug: string | null
  // Full-fidelity fields for the bespoke mobile praxis cards (#573). The list
  // schema now emits these; older callers simply ignore them.
  /** Proof body excerpt — clamped to 1–2 lines in the mobile card. */
  body_text?: string | null
  /** Author's own member faction — drives the actor-scoped byline. */
  created_by_faction_slug?: string | null
  /** Crew roster (owner + collaborators); empty/absent on solo. */
  members?: PraxisMemberOut[]
  /** Attached proof media (images / video / audio). */
  media_items?: MediaItemOut[]
  /** The authenticated viewer's own cast value (1–5); null/absent if unvoted. */
  viewer_vote?: number | null
  /**
   * Display name of an account-mate character who voted on this praxis — the
   * "voted by {name}" marker (#644, §7). Account-scoped, so it can be set even
   * when the *carried* character has no star of its own (`viewer_vote` null).
   * Null/absent when no character on the viewer's account has voted.
   */
  voted_by_name?: string | null
}

export interface PraxisCreate {
  task_id: number
  type?: PraxisType
  title?: string
  body_text?: string
}

export interface PraxisUpdate {
  title?: string
  body_text?: string
}

// ---------------------------------------------------------------------------
// List / detail
// ---------------------------------------------------------------------------

export async function listPraxes(filters?: {
  task_id?: number
  character_id?: number
  member_id?: number
  type?: PraxisType
  status?: PraxisStatus
  faction?: string
  /**
   * Free-text search over praxis title, praxis body, task title, and member
   * name/handle (#644 §4; member axis added in #681).
   */
  q?: string
  /**
   * Account-scoped vote filter (#644 §6). `no` = "needs my vote" (votable and
   * unvoted, excluding praxes my account is a member of); `yes` = any vote from
   * any of my characters. The two are deliberately not complements.
   */
  voted?: 'yes' | 'no'
  /** Seal-date order (#644 §2). Defaults server-side to `newest`. */
  sort?: 'newest' | 'oldest'
  limit?: number
  offset?: number
}): Promise<PraxisCardOut[]> {
  const { data } = await api.get<PraxisCardOut[]>('/praxes', { params: filters })
  // Server truth — retire any local vote overrides so they can't double-count (#626).
  clearVoteOverrides(data.map((praxis) => praxis.id))
  return data
}

export async function getPraxis(id: number): Promise<PraxisOut> {
  const { data } = await api.get<PraxisOut>(`/praxes/${id}`)
  clearVoteOverrides([id])
  return data
}

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------

export async function createPraxis(data: PraxisCreate): Promise<PraxisOut> {
  const { data: result } = await api.post<PraxisOut>('/praxes', data)
  return result
}

export async function updatePraxis(id: number, data: PraxisUpdate): Promise<PraxisOut> {
  const { data: result } = await api.put<PraxisOut>(`/praxes/${id}`, data)
  return result
}

export async function deletePraxis(id: number): Promise<void> {
  await api.delete(`/praxes/${id}`)
}

/** Flip a praxis between solo and collab in place, preserving id/content/media (#321). */
export async function changePraxisType(id: number, type: PraxisType): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${id}/change-type`, { type })
  return data
}

// ---------------------------------------------------------------------------
// Lifecycle transitions
// ---------------------------------------------------------------------------

// Unsubmit a praxis back to editing (#590 renamed withdraw → unsubmit). For a
// sealed solo/collab this reopens the whole group; for a pending collab where
// the caller has submitted, it clears only the caller's part.
export async function unsubmitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${id}/unsubmit`)
  return data
}

export async function submitPraxis(id: number): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${id}/submit`)
  return data
}

/**
 * Leave a collab praxis you joined (not authored). Frees a task-bank slot —
 * unlike withdraw, which keeps the membership. Backend: POST /praxes/{id}/leave.
 */
export async function leavePraxis(id: number): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${id}/leave`)
  return data
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export async function uploadPraxisMedia(id: number, file: File): Promise<MediaItemOut> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<MediaItemOut>(`/praxes/${id}/media`, form)
  return data
}

export async function deletePraxisMedia(id: number, mediaId: number): Promise<void> {
  await api.delete(`/praxes/${id}/media/${mediaId}`)
}

// ---------------------------------------------------------------------------
// Collaboration / invite management
// ---------------------------------------------------------------------------

export async function inviteToPraxis(id: number, inviteeId: number): Promise<PraxisInviteOut> {
  const { data } = await api.post<PraxisInviteOut>(`/praxes/${id}/invite`, {
    invitee_id: inviteeId,
  })
  return data
}

export async function respondToInvite(
  praxisId: number,
  inviteId: number,
  accept: boolean,
): Promise<PraxisInviteOut> {
  const { data } = await api.post<PraxisInviteOut>(
    `/praxes/${praxisId}/invite/${inviteId}/respond`,
    { accept },
  )
  return data
}

/** Inviter rescinds a still-pending invite (#421). */
export async function cancelInvite(
  praxisId: number,
  inviteId: number,
): Promise<void> {
  await api.delete(`/praxes/${praxisId}/invite/${inviteId}`)
}

// ---------------------------------------------------------------------------
// Metatasks — metatasks are Task rows with task_type='metatask' attached
// to a praxis via POST /praxes/{id}/metatasks.
// ---------------------------------------------------------------------------

export async function applyMetatask(praxisId: number, taskId: number): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${praxisId}/metatasks`, {
    task_id: taskId,
  })
  return data
}

export async function removeMetatask(praxisId: number, taskId: number): Promise<void> {
  await api.delete(`/praxes/${praxisId}/metatasks/${taskId}`)
}

// ---------------------------------------------------------------------------
// Flagging — reason is the shared vocabulary (ADR-0037); same FlagIn body as
// the comment flag route. `reasonDetail` only travels with reason='other'.
// ---------------------------------------------------------------------------

export async function flagPraxis(
  praxisId: number,
  reason: FlagReason,
  reasonDetail?: string,
): Promise<void> {
  await api.post(`/praxes/${praxisId}/flag`, {
    reason,
    reason_detail: reasonDetail || null,
  })
}
