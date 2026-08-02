import api from './axios'

/** Matches backend RelationshipListItem (enriched list response) */
export interface RelationshipListItem {
  id: number
  from_character_id: number
  to_character_id: number
  type: 'friend' | 'foe'
  status: 'active' | 'blocked'
  created_at: string
  to_display_name: string
  to_avatar_url: string
  to_faction_slug: string
  // The reverse edge's raw type is not emitted: `display_status` is the
  // server's word on what the pair of edges means (#1387).
  display_status: 'Mutual Friends' | 'Rivals' | 'Tsundere' | 'One-sided Friend' | 'One-sided Foe' | 'Secret Admirer' | 'Targeted' | 'Blocked' | 'Unknown'
}

/** Matches backend RelationshipOut (basic create/update response) */
export interface RelationshipOut {
  id: number
  from_character_id: number
  to_character_id: number
  type: 'friend' | 'foe'
  status: 'active' | 'blocked'
  created_at: string
}

export interface RelationshipFilters {
  status?: string
  type?: string
}

export async function listRelationships(filters?: RelationshipFilters): Promise<RelationshipListItem[]> {
  const { data } = await api.get<RelationshipListItem[]>('/relationships', { params: filters })
  return data
}

export async function createRelationship(to_character_id: number, type: 'friend' | 'foe'): Promise<RelationshipOut> {
  const { data } = await api.post<RelationshipOut>('/relationships', { to_character_id, type })
  return data
}

/** Block a relationship. Either party can block. */
export async function blockRelationship(id: number): Promise<RelationshipOut> {
  const { data } = await api.put<RelationshipOut>(`/relationships/${id}`)
  return data
}

/** Reverse a block (ADR-0009) — restores the edge to active. Either party can unblock. */
export async function unblockRelationship(id: number): Promise<RelationshipOut> {
  const { data } = await api.post<RelationshipOut>(`/relationships/${id}/unblock`)
  return data
}

export async function deleteRelationship(id: number): Promise<void> {
  await api.delete(`/relationships/${id}`)
}
