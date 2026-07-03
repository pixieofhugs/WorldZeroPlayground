/**
 * The endpoint switch that broke duel-accept (#346): duel challenges must hit
 * POST /duels/:id/respond with payload.duel_id, NOT the collab invite
 * endpoint with (undefined, undefined). Guards the dispatch + the per-type
 * status field normalization.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActivityFeedItem } from '../../api/activityFeed'
import {
  respondToRequest,
  requestStatusOf,
  normalizeRequestStatus,
} from '../useRespondToRequest'
import { respondToInvite } from '../../api/praxis'
import { respondToChallenge } from '../../api/duel'

vi.mock('../../api/praxis', () => ({ respondToInvite: vi.fn() }))
vi.mock('../../api/duel', () => ({ respondToChallenge: vi.fn() }))

const feedItem = (type: string, payload: Record<string, unknown>): ActivityFeedItem => ({
  type,
  timestamp: '2026-07-03T00:00:00Z',
  actor_display_name: 'Rival',
  actor_faction_slug: 'snide',
  actor_avatar_url: null,
  payload,
  context_faction_slug: null,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('respondToRequest dispatch', () => {
  it('routes collab_invite to the praxis invite endpoint and returns the shared praxis', async () => {
    const item = feedItem('collab_invite', { praxis_id: 7, invite_id: 42, invite_status: 'pending' })
    const praxisId = await respondToRequest(item, true)
    expect(respondToInvite).toHaveBeenCalledWith(7, 42, true)
    expect(respondToChallenge).not.toHaveBeenCalled()
    expect(praxisId).toBe(7)
  })

  it('routes duel_challenge to the duel respond endpoint with duel_id (the #346 bug)', async () => {
    vi.mocked(respondToChallenge).mockResolvedValue({ opponent_praxis_id: 99 } as never)
    const item = feedItem('duel_challenge', {
      duel_id: 5,
      challenger_praxis_id: 11,
      duel_status: 'pending',
    })
    const praxisId = await respondToRequest(item, true)
    expect(respondToChallenge).toHaveBeenCalledWith(5, { accept: true })
    expect(respondToInvite).not.toHaveBeenCalled()
    // The fresh opponent praxis created by the accept, not the challenger's.
    expect(praxisId).toBe(99)
  })

  it('declines a duel via the same endpoint with accept: false', async () => {
    vi.mocked(respondToChallenge).mockResolvedValue({ opponent_praxis_id: null } as never)
    const item = feedItem('duel_challenge', { duel_id: 5, duel_status: 'pending' })
    const praxisId = await respondToRequest(item, false)
    expect(respondToChallenge).toHaveBeenCalledWith(5, { accept: false })
    expect(praxisId).toBeNull()
  })

  it('rejects non-request feed items', async () => {
    const item = feedItem('era_announcement', {})
    await expect(respondToRequest(item, true)).rejects.toThrow(/not a respondable/i)
  })
})

describe('status normalization', () => {
  it('reads invite_status for collabs and duel_status for duels', () => {
    expect(requestStatusOf(feedItem('collab_invite', { invite_status: 'pending' }))).toBe('pending')
    expect(requestStatusOf(feedItem('duel_challenge', { duel_status: 'pending' }))).toBe('pending')
    // A duel card must not read the (absent) collab field and look pending forever.
    expect(requestStatusOf(feedItem('duel_challenge', { duel_status: 'declined' }))).toBe('declined')
  })

  it('maps duel active/settled to accepted', () => {
    expect(normalizeRequestStatus('active')).toBe('accepted')
    expect(normalizeRequestStatus('settled')).toBe('accepted')
    expect(normalizeRequestStatus('accepted')).toBe('accepted')
  })

  it('treats missing status as pending', () => {
    expect(normalizeRequestStatus(null)).toBe('pending')
    expect(normalizeRequestStatus(undefined)).toBe('pending')
  })
})
