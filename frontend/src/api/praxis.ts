import api from './axios'
import type { TaskOut } from './tasks'
import type { FlagReason } from '../utils/flagReasons'

// ---------------------------------------------------------------------------
// Types — match backend schemas/praxis.py exactly
// ---------------------------------------------------------------------------

export type PraxisType = 'solo' | 'collab' | 'duel'
export type PraxisStatus = 'in_progress' | 'submitted'
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
  score: number
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
  created_at: string
  updated_at: string
  submitted_at: string | null
  member_count: number
  score: number
  voter_count: number
  /** Task Crown — top-scoring submitted praxis for its task (ADR-0028). */
  is_top_for_task: boolean
  task_faction_slug: string | null
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

export interface PraxisVoteIn {
  value: number
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
  limit?: number
  offset?: number
}): Promise<PraxisCardOut[]> {
  const { data } = await api.get<PraxisCardOut[]>('/praxes', { params: filters })
  return data
}

export async function getPraxis(id: number): Promise<PraxisOut> {
  const { data } = await api.get<PraxisOut>(`/praxes/${id}`)
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

export async function withdrawPraxis(id: number): Promise<PraxisOut> {
  const { data } = await api.post<PraxisOut>(`/praxes/${id}/withdraw`)
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
// Voting
// ---------------------------------------------------------------------------

export async function votePraxis(id: number, data: PraxisVoteIn): Promise<void> {
  await api.post(`/praxes/${id}/vote`, data)
}

// ---------------------------------------------------------------------------
// Flagging — reason is the shared vocabulary (ADR-0031); same FlagIn body as
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
