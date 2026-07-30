/**
 * Mobile Updates = a MIXED, multi-faction stream (#532), not seven per-faction
 * screens. Renders MobileUpdates with a feed whose items carry DIFFERENT
 * `context_faction_slug` values and proves each card keeps its OWN faction frame
 * (distinct COVEN / UA / SNIDE chrome coexisting in one render) — never one
 * uniform tint. Reuses the shared FeedCardRouter + normalizeFeedItem path.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import MobileUpdates from '../MobileUpdates'
import type { UpdatesState } from '../useUpdates'
import type { ActivityFeedItem } from '../../../api/activityFeed'

function completion(slug: string, id: number, title: string): ActivityFeedItem {
  return {
    type: 'friend_completion',
    item_key: `friend_completion:${id}`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: slug,
    actor_avatar_url: null,
    payload: { character_id: id, praxis_id: id, task_title: title, task_point_value: 40 },
    context_faction_slug: slug,
  }
}

function baseState(overrides: Partial<UpdatesState>): UpdatesState {
  return {
    items: [],
    counts: { all: 3, friends: 3, foes: 0, your_stuff: 0, global_count: 0, requests: 0 },
    filter: 'All',
    setFilter: () => {},
    loading: false,
    loadingMore: false,
    nextCursor: null,
    fetchError: null,
    loadMoreError: null,
    loadMore: async () => {},
    archivedView: false,
    refreshCounts: () => {},
    archiveAll: async () => {},
    restoreAll: async () => {},
    bulkPending: false,
    bulkError: null,
    ...overrides,
  }
}

function render(state: UpdatesState): { html: string; text: string } {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <MobileUpdates state={state} />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

describe('mobile Updates mixed multi-faction stream', () => {
  const items = [
    completion('coven', 1, 'Cast a small spell'),
    completion('ua', 2, 'Hang the canvas'),
    completion('snide', 3, 'Map the boring'),
  ]

  it('renders a single-column stream marked as the mobile surface', () => {
    const { html } = render(baseState({ items }))
    expect(html).toContain('data-feed="mobile"')
  })

  it('keeps each card in its OWN faction frame — COVEN + UA chrome coexist', () => {
    const { text, html } = render(baseState({ items }))
    // Distinct per-faction frame markers appearing TOGETHER in one render
    // prove a mixed stream, not one uniform tint.
    expect(text, 'COVEN window chrome').toContain('coven.exe')
    // UA's frame is dress only (#851), and #1201 restated that dress: the flat
    // 3px orange border became the kit's own ink column and the ground became
    // the three-stop paper stock. The stock is the marker — unique to the UA
    // chassis, and still a token rather than a house line.
    expect(html, 'UA parchment chassis').toContain('var(--faction-ua-parchment)')
    expect(html, 'SNIDE dossier tokens').toContain('--faction-snide')
    expect(html, 'COVEN scrapbook tokens').toContain('--faction-coven')
  })

  it('renders every card body (the shared FeedRowContent rows)', () => {
    const { text } = render(baseState({ items }))
    expect(text).toContain('Cast a small spell')
    expect(text).toContain('Hang the canvas')
    expect(text).toContain('Map the boring')
  })

  it('shows the FEED empty state when the stream is empty (#1194)', () => {
    const { text } = render(baseState({ items: [] }))
    expect(text).toContain('Nothing left to read.')
    expect(text).toContain('The city is quiet.')
  })

  it('shows the ARCHIVE empty state on the Archived tab, never the feed one', () => {
    // Two empty states, never collapsed into one: an empty feed is an invitation
    // to go and do something, an empty archive is a statement that you have
    // thrown nothing away.
    const { text } = render(
      baseState({ items: [], filter: 'Archived', archivedView: true }),
    )
    expect(text).toContain('The archive is empty.')
    expect(text).not.toContain('Nothing left to read.')
  })
})
