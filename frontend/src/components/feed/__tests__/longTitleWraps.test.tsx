/**
 * A long unbroken headline (a pasted URL) must wrap, not widen /updates. As in
 * displayNameMinContent, the claim asserted is the value: `overflow-wrap: anywhere`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { AuthContext } from '../../../auth/AuthContext'
import FeedRowContent from '../FeedRowContent'
import FeedCardCollabInvite from '../FeedCardCollabInvite'
import FeedCardDuelChallenge from '../FeedCardDuelChallenge'
import { normalizeFeedItem } from '../normalizeFeedItem'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import type { CurrentUser } from '../../../api/auth'

const URL_TITLE = `https://example.org/${'a'.repeat(60)}`

function item(type: string, payload: Record<string, unknown>): ActivityFeedItem {
  return {
    type,
    item_key: `${type}:1`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: 'coven',
    actor_avatar_url: null,
    payload,
    context_faction_slug: 'coven',
  }
}

/** Style of the tag immediately before the title text. */
function titleStyle(html: string): string {
  const at = html.indexOf(URL_TITLE)
  expect(at, 'the title renders at all').toBeGreaterThan(-1)
  const openTag = html.slice(0, at).lastIndexOf('<')
  return /style="([^"]*)"/.exec(html.slice(openTag, at))?.[1] ?? ''
}

function renderRow(type: string, payload: Record<string, unknown>): string {
  const row = normalizeFeedItem(item(type, payload))
  if (!row) throw new Error(`no row for ${type}`)
  return renderToStaticMarkup(
    <MemoryRouter>
      <FeedRowContent row={row} avatarUrl={null} />
    </MemoryRouter>,
  )
}

function renderCard(node: React.ReactNode): string {
  const user = { character: { id: 1, faction_slug: 'coven' } } as unknown as CurrentUser
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{ user, loading: false, refetch: async () => {}, applyUser: () => {}, signOut: async () => {} }}
    >
      <MemoryRouter>{node}</MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('an 80-char unbroken title wraps (#3802)', () => {
  it('the feed row headline', () => {
    const html = renderRow('friend_completion', {
      character_id: 4,
      praxis_id: 9,
      task_title: URL_TITLE,
      task_point_value: 3,
    })
    expect(titleStyle(html)).toContain('overflow-wrap:anywhere')
  })

  it('the quoted headline', () => {
    const html = renderRow('comment_on_mine', { character_id: 4, excerpt: URL_TITLE })
    expect(titleStyle(html)).toContain('overflow-wrap:anywhere')
  })

  it('the duel challenge', () => {
    const html = renderCard(
      <FeedCardDuelChallenge
        item={item('duel_challenge', {
          duel_id: 2,
          challenger_praxis_id: 30,
          task_title: URL_TITLE,
          task_point_value: 4,
          challenger_character_id: 4,
        })}
      />,
    )
    expect(titleStyle(html)).toContain('overflow-wrap:anywhere')
  })

  it('the collab invite', () => {
    const html = renderCard(
      <FeedCardCollabInvite
        item={item('collab_invite', {
          praxis_id: 12,
          invite_id: 3,
          task_title: URL_TITLE,
          task_point_value: 5,
          task_level_required: 1,
          inviter_character_id: 4,
        })}
      />,
    )
    expect(titleStyle(html)).toContain('overflow-wrap:anywhere')
  })
})
