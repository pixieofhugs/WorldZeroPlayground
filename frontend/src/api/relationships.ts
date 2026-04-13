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
  reverse_type: string | null
  display_status: string
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

export async function deleteRelationship(id: number): Promise<void> {
  await api.delete(`/relationships/${id}`)
}
