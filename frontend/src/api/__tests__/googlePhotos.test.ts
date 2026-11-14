import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiDelete, apiGet, apiPost } from '../client'
import {
  abandonPhotosSession,
  ingestPhotosSession,
  pollPhotosSession,
  startPhotosSession,
} from '../googlePhotos'

vi.mock('../client', () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(apiGet).mockResolvedValue({ data: 'got' } as never)
  vi.mocked(apiPost).mockResolvedValue({ data: 'posted' } as never)
  vi.mocked(apiDelete).mockResolvedValue({} as never)
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
