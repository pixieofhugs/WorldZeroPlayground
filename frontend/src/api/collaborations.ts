import api from './axios'

export type CollaborationMode = 'collaboration' | 'duel'
export type CollaborationStatus = 'in_progress' | 'published'
export type CollaborationInviteStatus = 'pending' | 'accepted' | 'declined'

export interface CollaborationMemberOut {
  character_id: number
  display_name: string
  faction_slug: string | null
  avatar_url: string | null
  has_submitted: boolean
  joined_at: string
}

export interface CollaborationInviteOut {
  id: number
  collaboration_id: number
  inviter_id: number
  inviter_display_name: string
  invitee_id: number
  invitee_display_name: string
  type: CollaborationMode
  status: CollaborationInviteStatus
  created_at: string
}

export interface CollaborationOut {
  id: number
  task_id: number
  task_title: string
  mode: CollaborationMode
  status: CollaborationStatus
  body_text: string | null
  members: CollaborationMemberOut[]
  invites: CollaborationInviteOut[] | null
  created_by_id: number
  created_at: string
  updated_at: string
}

export interface DuelVoteSummary {
  character_id: number
  display_name: string
  faction_slug: string | null
  total_stars: number
  vote_count: number
  is_winning: boolean
}

export async function createCollaboration(
  task_id: number,
  mode: CollaborationMode,
): Promise<CollaborationOut> {
  const { data } = await api.post<CollaborationOut>('/collaborations', { task_id, mode })
  return data
}

export async function getCollaboration(id: number): Promise<CollaborationOut> {
  const { data } = await api.get<CollaborationOut>(`/collaborations/${id}`)
  return data
}

export async function updateDocument(id: number, body_text: string): Promise<CollaborationOut> {
  const { data } = await api.post<CollaborationOut>(`/collaborations/${id}/document`, { body_text })
  return data
}

export async function inviteMember(
  collaboration_id: number,
  invitee_character_id: number,
): Promise<CollaborationInviteOut> {
  const { data } = await api.post<CollaborationInviteOut>(
    `/collaborations/${collaboration_id}/invite`,
    { invitee_character_id },
  )
  return data
}

export async function respondToInvite(
  collaboration_id: number,
  invite_id: number,
  accept: boolean,
  drop_task_id?: number,
): Promise<CollaborationOut> {
  const { data } = await api.post<CollaborationOut>(
    `/collaborations/${collaboration_id}/invites/${invite_id}/respond`,
    { accept, drop_task_id: drop_task_id ?? null },
  )
  return data
}

export async function submitForMember(collaboration_id: number): Promise<CollaborationOut> {
  const { data } = await api.post<CollaborationOut>(`/collaborations/${collaboration_id}/submit`)
  return data
}

export async function reopenCollaboration(collaboration_id: number): Promise<CollaborationOut> {
  const { data } = await api.post<CollaborationOut>(`/collaborations/${collaboration_id}/edit`)
  return data
}

export async function kickMember(
  collaboration_id: number,
  target_character_id: number,
): Promise<CollaborationOut> {
  const { data } = await api.post<CollaborationOut>(
    `/collaborations/${collaboration_id}/kick/${target_character_id}`,
  )
  return data
}

export async function getDuelVoteSummary(collaboration_id: number): Promise<DuelVoteSummary[]> {
  const { data } = await api.get<DuelVoteSummary[]>(`/collaborations/${collaboration_id}/votes`)
  return data
}

export async function castDuelVote(
  collaboration_id: number,
  target_character_id: number,
  stars: number,
): Promise<void> {
  await api.post(`/collaborations/${collaboration_id}/vote`, { target_character_id, stars })
}
