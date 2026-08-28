import { apiGet, apiPost, apiDelete } from './client'
import type { components } from './generated/schema'

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
  /**
   * Dormant since ADR-0077: always `active`. A block is its own record now, so
   * nothing writes `blocked` here and nothing reads this field. The column
   * survives only because dropping a value from a PG enum costs a table rewrite
   * and buys a tidier enum.
   */
  status: 'active'
  created_at: string
  to_display_name: string
  to_avatar_url: string
  to_faction_slug: string
  // The reverse edge's raw type is not emitted: `display_status` is the
  // server's word on what the pair of edges means (#1387). No `Blocked` arm —
  // ADR-0077 stopped computing one.
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

// `createRelationship` answers the enriched item the list emits (#1383). It
// used to answer the bare row, so every caller re-ran `listRelationships()` and
// searched it for the edge it had just written.
//
// The item describes THE EDGE, not the viewer: `to_*` always names
// `to_character_id`.

export async function createRelationship(to_character_id: number, type: 'friend' | 'foe'): Promise<RelationshipListItem> {
  const { data } = await apiPost('/relationships', { body: { to_character_id, type } })
  return data as RelationshipListItem
}

export async function deleteRelationship(id: number): Promise<void> {
  await apiDelete('/relationships/{relationship_id}', {
    params: { path: { relationship_id: id } },
  })
}

// ---------------------------------------------------------------------------
// Blocks (ADR-0077) — their own record, addressed by CHARACTER, never by edge.
//
// This is why #1907 exists. While a block was a `status` on a friend/foe edge,
// blocking meant naming a row id, and the only ids the client ever held were
// its own outgoing edges — so a player foe'd by someone they had never declared
// anything about had nothing to act on, which is the one player the feature was
// written for. A character id is something the profile always has.
// ---------------------------------------------------------------------------

/** One character this viewer has blocked, enriched for the profile. */
export type BlockListItem = components['schemas']['BlockListItem']

/**
 * The characters this viewer has blocked. Outgoing only, always.
 *
 * There is no incoming counterpart to add here: a block is silent to the party
 * it names (ADR-0077 ruling 2), and the backend emits no route, field or error
 * that would report one. The blocked side's silence is therefore structural in
 * this client — there is nothing to render it from and no branch to get wrong.
 */
export async function listBlocks(): Promise<BlockListItem[]> {
  const { data } = await apiGet('/relationships/blocks')
  return data as BlockListItem[]
}

/**
 * Block a character. Needs no friend or foe declaration and creates none, and
 * blocking someone already blocked answers the existing record rather than a
 * conflict.
 */
export async function blockCharacter(character_id: number): Promise<BlockListItem> {
  const { data } = await apiPost('/relationships/blocks', { body: { character_id } })
  return data as BlockListItem
}

/**
 * Lift this viewer's own block. Only the blocker authored the record, so only
 * the blocker can delete one, and deleting it restores nothing else — no
 * friend/foe edge comes back with it (ADR-0077 ruling 5).
 */
export async function unblockCharacter(character_id: number): Promise<void> {
  await apiDelete('/relationships/blocks/{character_id}', {
    params: { path: { character_id } },
  })
}
