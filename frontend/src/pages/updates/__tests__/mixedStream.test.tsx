/**
 * The Updates feed is a mixed multi-faction stream: each card keeps its own
 * faction frame. `useUpdates` is mocked (no effects in this harness).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { ActivityFeedItem, FeedCounts } from '../../../api/activityFeed'
import type { UpdatesState } from '../useUpdates'
import { CLEARED_FILTERS, type UpdatesFilters } from '../updatesFilters'

const mocks = vi.hoisted(() => ({ state: null as unknown }))

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))
vi.mock('../useUpdates', () => ({ useUpdates: () => mocks.state }))

import Updates from '../../Updates'

const COUNTS: FeedCounts = {
  all: 3,
  friends: 3,
  foes: 0,
  your_stuff: 0,
  global_count: 0,
  requests: 0,
  by_type: { friend_completion: 3 },
}

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

function baseState(overrides: Partial<UpdatesState> = {}): UpdatesState {
  const filters: UpdatesFilters = overrides.filters ?? CLEARED_FILTERS
  return {
    items: [],
    counts: COUNTS,
    filters,
    setFilters: () => {},
    clearFilters: () => {},
    loading: false,
    loadingMore: false,
    nextCursor: null,
    fetchError: null,
    loadMoreError: null,
    loadMore: async () => {},
    archivedView: filters.archived,
    refreshCounts: () => {},
    archiveAll: async () => {},
    restoreAll: async () => {},
    bulkPending: false,
    bulkError: null,
    bulkArchiveAvailable: filters.types.length === 0,
    ...overrides,
  }
}

function render(state: UpdatesState): { html: string; text: string } {
  mocks.state = state
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Updates />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

describe('the Updates mixed multi-faction stream', () => {
  const items = [
    completion('coven', 1, 'Cast a small spell'),
    completion('ua', 2, 'Hang the canvas'),
    completion('snide', 3, 'Map the boring'),
  ]

  it('keeps each card in its OWN faction frame — COVEN + UA chrome coexist', () => {
    const { html, text } = render(baseState({ items }))
    // No faction-name label on this surface (#1197), so markers are tokens.
    expect(html, 'COVEN candlelit-slip chrome').toContain('--faction-coven-slip-mid')
    expect(text, 'and no faction name survives on the card').not.toContain('coven.exe')
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

  it('states how many updates are showing, and pluralizes it', () => {
    expect(render(baseState({ items })).text).toContain('Showing 3 updates')
    expect(render(baseState({ items: items.slice(0, 1) })).text).toContain(
      'Showing 1 update',
    )
  })

  it('says nothing about a count while the feed is still loading', () => {
    expect(render(baseState({ loading: true })).text).not.toContain('Showing')
  })
})

describe('the three empty states are never collapsed into one', () => {
  it('an empty INBOX invites you to go and do something', () => {
    const { text } = render(baseState({ items: [] }))
    expect(text).toContain('Nothing left to read.')
    expect(text).toContain('The city is quiet.')
  })

  it('an empty ARCHIVE states that you have thrown nothing away', () => {
    const { text } = render(
      baseState({ items: [], filters: { ...CLEARED_FILTERS, archived: true } }),
    )
    expect(text).toContain('The archive is empty.')
    expect(text).not.toContain('Nothing left to read.')
  })

  it('a view FILTERED to nothing says so, and offers a way out', () => {
    const { text } = render(
      baseState({ items: [], filters: { ...CLEARED_FILTERS, types: ['nudge'] } }),
    )
    expect(text).toContain('No updates match these filters.')
    expect(text).not.toContain('The city is quiet.')
    expect(text).toContain('Clear all filters')
  })

  it('an empty archive with a type filter on is FILTERED, not "empty archive"', () => {
    const { text } = render(
      baseState({
        items: [],
        filters: { ...CLEARED_FILTERS, archived: true, types: ['nudge'] },
      }),
    )
    expect(text).toContain('No updates match these filters.')
    expect(text).not.toContain('The archive is empty.')
  })
})

describe('bulk archive is withheld when its scope would exceed the list', () => {
  const items = [completion('coven', 1, 'Cast a small spell')]

  it('offers "Archive all" on an unfiltered inbox', () => {
    expect(render(baseState({ items })).text).toContain('Archive all')
  })

  it('withholds it once a type is selected', () => {
    // `dismiss-all` takes no type selection, so it would archive more than shown.
    const { text } = render(
      baseState({ items, filters: { ...CLEARED_FILTERS, types: ['friend_completion'] } }),
    )
    expect(text).not.toContain('Archive all')
  })
})
