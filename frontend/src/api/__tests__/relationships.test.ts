import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiDelete, apiGet, apiPost } from '../client'
import { blockCharacter, createRelationship, deleteRelationship, listRelationships, unblockCharacter } from '../relationships'

vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(apiGet).mockResolvedValue({ data: 'got' } as never)
  vi.mocked(apiPost).mockResolvedValue({ data: 'posted' } as never)
  vi.mocked(apiDelete).mockResolvedValue({} as never)
})

describe('relationships', () => {
  it('passes filters as the query', async () => {
    await listRelationships({ type: 'foe' })
    expect(apiGet).toHaveBeenCalledWith('/relationships', { params: { query: { type: 'foe' } } })
  })
  it('create sends the target and type', async () => {
    await createRelationship(5, 'foe')
    expect(apiPost).toHaveBeenCalledWith('/relationships', { body: { to_character_id: 5, type: 'foe' } })
  })
  it('delete addresses the edge by relationship id', async () => {
    await deleteRelationship(3)
    expect(apiDelete).toHaveBeenCalledWith('/relationships/{relationship_id}', {
      params: { path: { relationship_id: 3 } },
    })
  })
  it('blocks are addressed by CHARACTER id, on their own routes (ADR-0077)', async () => {
    await blockCharacter(8)
    expect(apiPost).toHaveBeenCalledWith('/relationships/blocks', { body: { character_id: 8 } })
    await unblockCharacter(8)
    expect(apiDelete).toHaveBeenCalledWith('/relationships/blocks/{character_id}', {
      params: { path: { character_id: 8 } },
    })
  })
})
