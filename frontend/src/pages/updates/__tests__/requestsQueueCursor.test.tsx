/**
 * The Requests queue's pure cursor (#1422, `requestsQueueCursor.ts`): the whole
 * carousel behaviour, unclickable in this no-DOM harness. Plus render tests with
 * `useRequestsQueue` mocked.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import { REQUEST_ITEM_TYPES, type ActivityFeedItem } from '../../../api/activityFeed'
import {
  QUEUE_ITEM_TYPES,
  TRAY_CAP,
  isQueueItem,
  nextQueueKey,
  previousQueueKey,
  queueItems,
  selectQueueIndex,
  selectQueueTray,
} from '../requestsQueueCursor'
import type { RequestsQueueState } from '../useRequestsQueue'

const mocks = vi.hoisted(() => ({ state: null as unknown }))
vi.mock('../useRequestsQueue', () => ({ useRequestsQueue: () => mocks.state }))

import RequestsQueue from '../RequestsQueue'

function item(
  type: string,
  id: number,
  slug: string | null = 'coven',
  payload: Record<string, unknown> = {},
): ActivityFeedItem {
  return {
    type,
    item_key: `${type}:${id}`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: slug,
    actor_avatar_url: null,
    payload,
    context_faction_slug: slug,
  }
}

/** Ten obligations, the design's own queue depth. */
const TEN = Array.from({ length: 10 }, (_, index) =>
  item(QUEUE_ITEM_TYPES[index % QUEUE_ITEM_TYPES.length], index),
)

describe('what the queue accepts', () => {
  it('takes exactly the four obligation types', () => {
    expect([...QUEUE_ITEM_TYPES].sort()).toEqual([
      'awaiting_submission',
      'collab_invite',
      'duel_challenge',
      'invitation_letter',
    ])
    for (const type of QUEUE_ITEM_TYPES) {
      expect(isQueueItem(item(type, 1)), type).toBe(true)
    }
  })

  /** #2288: else the bell can badge a type the queue won't draw. */
  it('is the same set that feeds the bell, not merely the same length', () => {
    expect([...QUEUE_ITEM_TYPES].sort()).toEqual([...REQUEST_ITEM_TYPES].sort())
  })

  it('refuses a mention — news about you is not a request of you', () => {
    expect(isQueueItem(item('comment_mention', 1))).toBe(false)
  })

  it('drops anything else a widened backend filter might send', () => {
    const mixed = [
      item('collab_invite', 1),
      item('comment_mention', 2),
      item('friend_completion', 3),
      item('duel_challenge', 4),
    ]
    expect(queueItems(mixed).map((each) => each.type)).toEqual([
      'collab_invite',
      'duel_challenge',
    ])
  })
})

describe('which card is on screen', () => {
  it('starts at the newest obligation', () => {
    expect(selectQueueIndex(TEN, null)).toBe(0)
  })

  it('shows the card the cursor names', () => {
    expect(selectQueueIndex(TEN, TEN[6].item_key)).toBe(6)
  })

  it('falls back to the newest when the cursor names nothing — ANSWERING ADVANCES', () => {
    // The answered item is gone from the refetch, so its key no longer resolves.
    const answered = TEN[3].item_key
    const after = TEN.filter((each) => each.item_key !== answered)
    expect(selectQueueIndex(after, answered)).toBe(0)
    expect(after[selectQueueIndex(after, answered)].item_key).toBe(TEN[0].item_key)
  })

  it('has nothing on screen when nothing is waiting', () => {
    expect(selectQueueIndex([], null)).toBe(-1)
  })
})

describe('"Still waiting" advances, and wraps', () => {
  it('moves to the next obligation', () => {
    expect(nextQueueKey(TEN, TEN[0].item_key)).toBe(TEN[1].item_key)
  })

  it('wraps from the last back to the first — skipping resolves nothing', () => {
    expect(nextQueueKey(TEN, TEN[9].item_key)).toBe(TEN[0].item_key)
  })

  it('stays put when there is only one obligation', () => {
    const one = [TEN[0]]
    expect(nextQueueKey(one, one[0].item_key)).toBe(one[0].item_key)
  })

  it('goes backwards too, wrapping the other way', () => {
    expect(previousQueueKey(TEN, TEN[0].item_key)).toBe(TEN[9].item_key)
    expect(previousQueueKey(TEN, TEN[5].item_key)).toBe(TEN[4].item_key)
  })

  it('has nowhere to go on an empty queue', () => {
    expect(nextQueueKey([], null)).toBeNull()
    expect(previousQueueKey([], null)).toBeNull()
  })
})

describe('the done state', () => {
  it('is NOT reached by skipping through the whole queue', () => {
    let cursor: string | null = null
    for (let step = 0; step < TEN.length; step += 1) {
      cursor = nextQueueKey(TEN, cursor)
    }
    expect(cursor).toBe(TEN[0].item_key)
  })
})

describe('the chip tray — the queue’s one navigator', () => {
  it('never offers the card you are already looking at', () => {
    const tray = selectQueueTray(TEN, TEN[0].item_key, false)
    expect(tray.chips.map((chip) => chip.item_key)).not.toContain(TEN[0].item_key)
  })

  it('caps at four and reports the rest', () => {
    const tray = selectQueueTray(TEN, TEN[0].item_key, false)
    expect(tray.chips).toHaveLength(TRAY_CAP)
    expect(tray.hidden).toBe(5)
    expect(tray.expandable).toBe(true)
  })

  it('shows all of them once expanded, and can still be closed', () => {
    const tray = selectQueueTray(TEN, TEN[0].item_key, true)
    expect(tray.chips).toHaveLength(9)
    expect(tray.hidden).toBe(0)
    expect(tray.expandable).toBe(true)
  })

  it('offers no expander when everything already fits', () => {
    const five = TEN.slice(0, 5)
    const tray = selectQueueTray(five, five[0].item_key, false)
    expect(tray.chips).toHaveLength(4)
    expect(tray.hidden).toBe(0)
    expect(tray.expandable).toBe(false)
  })

  it('is empty when the only obligation is the one on screen', () => {
    const one = [TEN[0]]
    const tray = selectQueueTray(one, one[0].item_key, false)
    expect(tray.chips).toHaveLength(0)
    expect(tray.hidden).toBe(0)
  })
})

function state(overrides: Partial<RequestsQueueState> = {}): RequestsQueueState {
  return {
    items: [],
    loading: false,
    error: null,
    refresh: () => {},
    ...overrides,
  }
}

function render(queue: RequestsQueueState): { html: string; text: string } {
  mocks.state = queue
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <RequestsQueue />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

describe('the queue is a container, not a card set', () => {
  const waiting = item('awaiting_submission', 7, 'coven', {
    task_title: 'Wheatpaste an original poem',
    praxis_id: 7,
    praxis_type: 'collab',
    task_point_value: 45,
  })

  it('mounts the SHIPPED faction chassis for the item’s faction', () => {
    const { html, text } = render(state({ items: [waiting] }))
    expect(html, 'COVEN candlelit-slip chrome').toContain('--faction-coven-slip-mid')
    expect(text, 'and the shipped body inside it').toContain(
      'Wheatpaste an original poem',
    )
  })

  it('carries the anchor #1421 pointed nine deep links at', () => {
    expect(render(state({ items: [waiting] })).html).toContain('id="requests-queue"')
  })

  it('says nothing is waiting, without claiming mentions are owed', () => {
    // Mentions are not in the queue.
    const { text } = render(state())
    expect(text).toContain('Nothing is waiting on you.')
    expect(text).not.toContain('mentions')
  })

  it('offers no navigator and no skip when one obligation is left', () => {
    const { text } = render(state({ items: [waiting] }))
    expect(text).not.toContain('Still waiting')
  })

  it('offers the skip and the tray once there is somewhere to go', () => {
    const { text } = render(
      state({ items: [waiting, item('duel_challenge', 8, 'snide')] }),
    )
    expect(text).toContain('Still waiting')
  })
})
