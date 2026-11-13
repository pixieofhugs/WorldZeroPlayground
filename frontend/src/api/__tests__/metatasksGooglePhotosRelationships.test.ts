import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiDelete, apiGet, apiPost } from '../client'
import { listMetatasks, proposeMetatask } from '../metatasks'
import {
  abandonPhotosSession,
  ingestPhotosSession,
  pollPhotosSession,
  startPhotosSession,
} from '../googlePhotos'
import { blockCharacter, createRelationship, deleteRelationship, listRelationships, unblockCharacter } from '../relationships'

vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(apiGet).mockResolvedValue({ data: 'got' } as never)
  vi.mocked(apiPost).mockResolvedValue({ data: 'posted' } as never)
  vi.mocked(apiDelete).mockResolvedValue({} as never)
})

describe('metatasks', () => {
  it('lists only metatask-typed tasks', async () => {
    await listMetatasks()
    expect(apiGet).toHaveBeenCalledWith('/tasks', { params: { query: { task_type: 'metatask' } } })
  })
  it('a proposal is always sent as a metatask, whatever the caller put in the body', async () => {
    const body = { title: 't', description: 'd', point_value: 1, level_required: 6, metatask_faction_slug: 'coven' }
    await proposeMetatask({ ...body, task_type: 'standard' } as never)
    expect(apiPost).toHaveBeenCalledWith('/tasks', { body: { ...body, task_type: 'metatask' } })
  })
})

describe('googlePhotos', () => {
  it('start returns the session body', async () => {
    expect(await startPhotosSession()).toBe('posted')
  })
  it('poll returns only the state field', async () => {
    vi.mocked(apiGet).mockResolvedValue({ data: { state: 'ready', extra: 1 } } as never)
    expect(await pollPhotosSession('s1')).toBe('ready')
    expect(apiGet).toHaveBeenCalledWith('/auth/google/photos/sessions/{session_id}', {
      params: { path: { session_id: 's1' } },
    })
  })
  it('abandon targets the session id', async () => {
    await abandonPhotosSession('s1')
    expect(apiDelete).toHaveBeenCalledWith('/auth/google/photos/sessions/{session_id}', {
      params: { path: { session_id: 's1' } },
    })
  })
  it('ingest posts the session to the praxis the proof belongs to', async () => {
    await ingestPhotosSession(9, 's1')
    expect(apiPost).toHaveBeenCalledWith('/praxes/{praxis_id}/media/google-photos', {
      params: { path: { praxis_id: 9 } },
      body: { session_id: 's1' },
    })
  })
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
