import { apiGet, apiPost, apiDelete } from './client'
import type { components } from './generated/schema'

/**
 * ponytail (#1400): `type`/`status` are narrower than the schema's bare `str`
 * (only these values are written), so reads cast. Upgrade: a backend
 * `StrEnum`, then drop the casts.
 */
export interface RelationshipListItem {
  id: number
  from_character_id: number
  to_character_id: number
  type: 'friend' | 'foe'
  /** Dormant since ADR-0077: always `active` (blocks are their own record). */
  status: 'active'
  created_at: string
  to_display_name: string
  to_avatar_url: string
  to_faction_slug: string
  // The server's word on the edge pair (#1387); no `Blocked` arm since ADR-0077.
  display_status: 'Mutual Friends' | 'Rivals' | 'Tsundere' | 'One-sided Friend' | 'One-sided Foe' | 'Secret Admirer' | 'Targeted' | 'Unknown'
}

interface RelationshipFilters {
  status?: string
  type?: string
}

export async function listRelationships(filters?: RelationshipFilters): Promise<RelationshipListItem[]> {
  const { data } = await apiGet('/relationships', { params: { query: filters } })
  return data as RelationshipListItem[]
}

// Answers the enriched item (#1383); `to_*` names `to_character_id`, not the viewer.

export async function createRelationship(to_character_id: number, type: 'friend' | 'foe'): Promise<RelationshipListItem> {
  const { data } = await apiPost('/relationships', { body: { to_character_id, type } })
  return data as RelationshipListItem
}

export async function deleteRelationship(id: number): Promise<void> {
  await apiDelete('/relationships/{relationship_id}', {
    params: { path: { relationship_id: id } },
  })
}

// Blocks (ADR-0077): their own record, addressed by CHARACTER, so a player
// foe'd by a stranger can still block them (#1907).

export type BlockListItem = components['schemas']['BlockListItem']

/** Outgoing only: a block is silent to the blocked party (ADR-0077 ruling 2). */
export async function listBlocks(): Promise<BlockListItem[]> {
  const { data } = await apiGet('/relationships/blocks')
  return data as BlockListItem[]
}

/** Creates no friend/foe edge; re-blocking returns the existing record. */
export async function blockCharacter(character_id: number): Promise<BlockListItem> {
  const { data } = await apiPost('/relationships/blocks', { body: { character_id } })
  return data as BlockListItem
}

/** Restores no friend/foe edge (ADR-0077 ruling 5). */
export async function unblockCharacter(character_id: number): Promise<void> {
  await apiDelete('/relationships/blocks/{character_id}', {
    params: { path: { character_id } },
  })
}
