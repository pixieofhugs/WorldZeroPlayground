import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import i18n from '../../../i18n'
import FeedRowContent from '../FeedRowContent'
import { normalizeFeedItem } from '../normalizeFeedItem'
import type { ActivityFeedItem } from '../../../api/activityFeed'

const item = {
  type: 'duel_forfeited',
  item_key: 'duel_forfeited:1',
  timestamp: '2026-01-01T00:00:00Z',
  actor_display_name: 'Ada',
  actor_faction_slug: 'coven',
  actor_avatar_url: null,
  payload: { duel_id: 1, praxis_id: 12, task_title: 'Build a shed', task_faction_slug: 'coven' },
  context_faction_slug: 'coven',
} as unknown as ActivityFeedItem

describe('duel_forfeited row', () => {
  it('renders its catalog copy and the praxis link, with no raw key', () => {
    const row = normalizeFeedItem(item)
    if (!row) throw new Error('duel_forfeited has no row')
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FeedRowContent row={row} avatarUrl={null} />
      </MemoryRouter>,
    )
    expect(html).toContain(i18n.t('feed:row.action.duelForfeited'))
    expect(html).toContain('Build a shed')
    expect(html).toContain('href="/praxis/12"')
    expect(html).not.toContain('duelForfeited')
  })
})
