import api from './axios'

export interface RelationshipOut {
  id: number
  from_character_id: number
  to_character_id: number
  type: 'friend' | 'foe'
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
  from_character_display_name: string
  from_character_faction_slug: string | null
  to_character_display_name: string
  to_character_faction_slug: string | null
}

export interface RelationshipFilters {
  status?: 'pending' | 'accepted' | 'blocked'
  type?: 'friend' | 'foe'
}

export async function listRelationships(filters?: RelationshipFilters): Promise<RelationshipOut[]> {
  const { data } = await api.get<RelationshipOut[]>('/relationships', { params: filters })
  return data
}

export async function createRelationship(to_character_id: number, type: 'friend' | 'foe'): Promise<RelationshipOut> {
  const { data } = await api.post<RelationshipOut>('/relationships', { to_character_id, type })
  return data
}

export async function updateRelationship(id: number, action: 'accept' | 'decline' | 'block'): Promise<RelationshipOut> {
  const { data } = await api.put<RelationshipOut>(`/relationships/${id}`, { action })
  return data
}

export async function deleteRelationship(id: number): Promise<void> {
  await api.delete(`/relationships/${id}`)
}
