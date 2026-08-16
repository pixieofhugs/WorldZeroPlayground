import { apiGet, apiPost, apiPut, apiDelete } from './client'

/**
 * Matches backend RelationshipListItem (enriched list response).
 *
 * ponytail (#1400): `type` and `status` are narrower here than in the schema,
 * deliberately, so the four reads below narrow with a cast. The backend types
 * both as bare `str` (`schemas/relationship.py`) even though only these values
 * are ever written — `display_status` beside them shows what the annotated
 * version looks like. Widening these two to `string` would delete a guarantee
 * the UI branches on in order to match an annotation gap; the upgrade path is a
 * backend `StrEnum`, after which the casts go.
 */
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
  const { data } = await apiGet('/relationships', { params: { query: filters } })
  return data as RelationshipListItem[]
}

// The three mutations below answer the same enriched item the list emits
// (#1383). They used to answer the bare row, so every caller re-ran
// `listRelationships()` and searched it for the edge it had just written.
//
// The item describes THE EDGE, not the viewer: `to_*` always names
// `to_character_id`, and either party may block or unblock (ADR-0009,
// superseded by ADR-0077 — under which a block is its own record and only
// the blocker may lift it).

export async function createRelationship(to_character_id: number, type: 'friend' | 'foe'): Promise<RelationshipListItem> {
  const { data } = await apiPost('/relationships', { body: { to_character_id, type } })
  return data as RelationshipListItem
}

/** Block a relationship. Either party can block. */
export async function blockRelationship(id: number): Promise<RelationshipListItem> {
  const { data } = await apiPut('/relationships/{relationship_id}', {
    params: { path: { relationship_id: id } },
  })
  return data as RelationshipListItem
}

/**
 * Reverse a block — restores the edge to active. Either party can unblock.
 * ADR-0009, superseded by ADR-0077: unblock becomes the deletion of a block
 * record, authored by the blocker alone.
 */
export async function unblockRelationship(id: number): Promise<RelationshipListItem> {
  const { data } = await apiPost('/relationships/{relationship_id}/unblock', {
    params: { path: { relationship_id: id } },
  })
  return data as RelationshipListItem
}

export async function deleteRelationship(id: number): Promise<void> {
  await apiDelete('/relationships/{relationship_id}', {
    params: { path: { relationship_id: id } },
  })
}
