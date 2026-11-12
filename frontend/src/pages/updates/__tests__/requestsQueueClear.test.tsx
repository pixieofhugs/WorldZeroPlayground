/**
 * A clear Requests queue costs one line, not a screenful (#2234): the empty
 * panel pushed a phone's notifications below the fold. No layout here, so this
 * asserts which blocks the clear state draws. The section (the bell's anchor)
 * must survive.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import { REQUESTS_QUEUE_ANCHOR } from '../requestsQueueAnchor'
import type { RequestsQueueState } from '../useRequestsQueue'

const mocks = vi.hoisted(() => ({ state: null as unknown }))
vi.mock('../useRequestsQueue', () => ({ useRequestsQueue: () => mocks.state }))

import RequestsQueue from '../RequestsQueue'

function item(type: string, id: number): ActivityFeedItem {
  return {
    type,
    item_key: `${type}:${id}`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: 'coven',
    actor_avatar_url: null,
    payload: {},
    context_faction_slug: 'coven',
  }
}

function render(state: Partial<RequestsQueueState>): string {
  mocks.state = { items: [], loading: false, error: null, refresh: () => {}, ...state }
  return renderToStaticMarkup(
    <MemoryRouter>
      <RequestsQueue />
    </MemoryRouter>,
  )
}

const DONE_TITLE = i18n.t('queue.doneTitle', { ns: 'feed' })

describe('a clear queue', () => {
  const html = render({ items: [] })

  it('draws no heading band — no eyebrow, no title, no collapse toggle', () => {
    expect(html).not.toContain('requests-queue__head')
    expect(html).not.toContain('requests-queue__toggle')
    expect(html).not.toContain(i18n.t('queue.eyebrow', { ns: 'feed' }))
  })

  it('draws no bordered panel and no dashed empty box', () => {
    expect(html).not.toContain('requests-queue__done')
    expect(html).not.toContain('class="requests-queue"')
    // Literal: the catalog key is gone.
    expect(html).not.toContain('Answer what arrives and this stays clear.')
  })

  it('still says so, in one line', () => {
    expect(html).toContain(DONE_TITLE)
  })

  it('keeps the anchor the phone bell links to', () => {
    expect(html).toContain(`id="${REQUESTS_QUEUE_ANCHOR}"`)
  })
})

describe('a queue with something in it', () => {
  const html = render({ items: [item('collab_invite', 1), item('duel_challenge', 2)] })

  it('draws the full panel — an obligation outranks the stream', () => {
    expect(html).toContain('requests-queue__head')
    expect(html).toContain('requests-queue__toggle')
    expect(html).toContain(i18n.t('queue.eyebrow', { ns: 'feed' }))
  })

  it('does not print the clear line while work is outstanding', () => {
    expect(html).not.toContain(DONE_TITLE)
  })
})

describe('while it is still loading', () => {
  it('draws the compact shell, so nothing jumps when the answer arrives', () => {
    const html = render({ items: [], loading: true })
    expect(html).not.toContain('requests-queue__head')
    expect(html).toContain(`id="${REQUESTS_QUEUE_ANCHOR}"`)
  })
})

describe('when the fetch failed', () => {
  it('keeps the full panel — an error is not a clear queue', () => {
    const html = render({ items: [], error: 'Could not load your requests.' })
    expect(html).toContain('requests-queue__head')
    expect(html).toContain('Could not load your requests.')
  })
})
