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

export interface RelationshipFilters {
  status?: string
  type?: string
}

export async function listRelationships(filters?: RelationshipFilters): Promise<RelationshipListItem[]> {
  const { data } = await api.get<RelationshipListItem[]>('/relationships', { params: filters })
  return data
}

// The three mutations below answer the same enriched item the list emits
// (#1383). They used to answer the bare row, so every caller re-ran
// `listRelationships()` and searched it for the edge it had just written.
//
// The item describes THE EDGE, not the viewer: `to_*` always names
// `to_character_id`, and either party may block or unblock (ADR-0009).

export async function createRelationship(to_character_id: number, type: 'friend' | 'foe'): Promise<RelationshipListItem> {
  const { data } = await api.post<RelationshipListItem>('/relationships', { to_character_id, type })
  return data
}

/** Block a relationship. Either party can block. */
export async function blockRelationship(id: number): Promise<RelationshipListItem> {
  const { data } = await api.put<RelationshipListItem>(`/relationships/${id}`)
  return data
}

/** Reverse a block (ADR-0009) — restores the edge to active. Either party can unblock. */
export async function unblockRelationship(id: number): Promise<RelationshipListItem> {
  const { data } = await api.post<RelationshipListItem>(`/relationships/${id}/unblock`)
  return data
}

export async function deleteRelationship(id: number): Promise<void> {
  await api.delete(`/relationships/${id}`)
}
