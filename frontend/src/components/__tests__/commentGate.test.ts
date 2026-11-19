import { describe, it, expect } from 'vitest'
import { normalizeFeedItem } from '../feed/normalizeFeedItem'
import { commentLevelRequired } from '../../hooks/useCommentGate'
import type { ActivityFeedItem } from '../../api/activityFeed'
import type { GameConfigOut } from '../../api/gameConfig'

const mention: ActivityFeedItem = {
  type: 'comment_mention',
  item_key: 'comment_mention:1',
  timestamp: '2026-01-01T00:00:00Z',
  actor_display_name: 'Ada',
  actor_faction_slug: 'coven',
  actor_avatar_url: null,
  payload: { comment_id: 1, praxis_id: 12, excerpt: 'hi' },
  context_faction_slug: 'coven',
}

describe('comment gate copy', () => {
  it('the Reply action names the level only while gated, and still links to the praxis', () => {
    const open = normalizeFeedItem(mention)!.actions[0]
    const gated = normalizeFeedItem(mention, 2)!.actions[0]
    expect(open.label).toBe('Reply')
    expect(gated.label).toBe('Reach level 2 to reply')
    expect(gated.href).toBe('/praxis/12')
  })

  it('reads the level from the rung that unlocks the comment ability', () => {
    const rung = (keys: string[]) => ({
      rank_key: 'r',
      unlocks: keys.map((key) => ({ kind: 'ability' as const, key })),
    })
    const config = { level_profiles: [rung([]), rung(['vote']), rung(['comment'])] }
    expect(commentLevelRequired(config as unknown as GameConfigOut)).toBe(2)
    expect(commentLevelRequired(null)).toBeNull()
  })
})
