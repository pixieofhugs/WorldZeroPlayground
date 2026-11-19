import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../i18n'
import type { ActivityFeedItem } from '../../api/activityFeed'
import CommentThread from '../comments/CommentThread'
import FeedCardRouter from '../feed/FeedCardRouter'

const state = vi.hoisted(() => ({ canComment: false }))
vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, character: { id: 1, username: 'ada', faction_slug: 'na' }, can_comment: state.canComment },
  }),
}))
const rung = (keys: string[]) => ({
  rank_key: 'r',
  unlocks: keys.map((key) => ({ kind: 'ability', key })),
})
vi.mock('../../hooks/useGameConfig', () => ({
  useGameConfig: () => ({ level_profiles: [rung([]), rung([]), rung(['comment'])] }),
}))

const MENTION: ActivityFeedItem = {
  type: 'comment_mention',
  item_key: 'comment_mention:1',
  timestamp: '2026-01-01T00:00:00Z',
  actor_display_name: 'Ada',
  actor_faction_slug: 'coven',
  actor_avatar_url: null,
  payload: { comment_id: 1, praxis_id: 12, excerpt: 'hi' },
  context_faction_slug: 'coven',
}

const inRouter = (ui: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{ui}</MemoryRouter>)
const thread = () => inRouter(<CommentThread target="praxes" targetId={1} seed={[]} />)

beforeEach(() => {
  state.canComment = false
})

describe('comment gate, rendered', () => {
  it('thread: a below-level player sees the gate line and no composer', () => {
    const html = thread()
    expect(html).toContain('Reach level 2 to join the discussion')
    expect(html).not.toContain('Say something worth keeping')
  })

  it('thread: an eligible player sees the composer and no gate line', () => {
    state.canComment = true
    const html = thread()
    expect(html).toContain('Say something worth keeping')
    expect(html).not.toContain('Reach level')
  })

  it('feed card: Reply names the level only while can_comment is false', () => {
    expect(inRouter(<FeedCardRouter item={MENTION} />)).toContain('Reach level 2 to reply')
    state.canComment = true
    const html = inRouter(<FeedCardRouter item={MENTION} />)
    expect(html).toContain('Reply')
    expect(html).not.toContain('Reach level')
  })
})
