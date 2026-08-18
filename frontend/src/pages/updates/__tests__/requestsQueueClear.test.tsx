/**
 * A CLEAR Requests queue costs one line, not a screenful (#2234).
 *
 * THE DEFECT
 * ----------
 * The reporter opened Updates on a phone after a low-priority notification and
 * saw nothing they had been notified about — "it looks like the notification
 * system is broken, even though it's not". Measured off their screenshot
 * (402x874 CSS px, the tab bar's top edge at 742): the hero took to y=314 and
 * the Requests panel then ran 314 → 550, all of it to say that nothing was
 * waiting. The filter bar and the bulk-archive row followed, and the feed's
 * first date divider landed at 713 — about 29px of stream above the tab bar.
 *
 * The queue is not wrong to be first; ADR-0070 makes it the only live home for
 * an unanswered obligation, so an obligation outranks the stream. An EMPTY
 * queue outranks nothing. Drawing its eyebrow, its title, its collapse toggle
 * and a dashed 2-line panel to report the absence is 236px spent on a negative,
 * and it is what pushed the actual notifications below the fold.
 *
 * SEAM
 * ----
 * The container's rendered markup, with `useRequestsQueue` mocked — the pattern
 * this directory already uses (`requestsQueueCursor.test.tsx`,
 * `mixedStream.test.tsx`), because the harness is `renderToStaticMarkup` with
 * no DOM and no effects, so a self-fetching queue cannot be driven any other
 * way. What is NOT assertable here is the pixel: there is no layout and no
 * viewport, so "is the first card above the fold" is not measurable in CI and
 * will not be (see the ruling on #2244). What IS assertable is which blocks the
 * clear state draws — every one of them has a height, and the count of them is
 * the whole defect.
 *
 * The section itself must SURVIVE, empty or not: `MobileHeader`'s bell is the
 * phone's only route to this page and it links to this element's fragment, so
 * unmounting it would trade one confusing screen for a link that goes nowhere.
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

// Imported after the mock is registered.
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
    // The panel's second line went with the box. Written out rather than read
    // through `t()`, because the key is gone: a typed `t('queue.doneBody')` no
    // longer compiles, which is the catalog doing its job.
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
