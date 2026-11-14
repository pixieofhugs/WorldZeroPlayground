import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiGet, apiPost } from '../client'
import { listMetatasks, proposeMetatask } from '../metatasks'

vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(apiGet).mockResolvedValue({ data: 'got' } as never)
  vi.mocked(apiPost).mockResolvedValue({ data: 'posted' } as never)
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
