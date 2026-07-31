/**
 * The Requests queue (#1422) — the seam under test is
 * `pages/updates/requestsQueue.ts`: which obligation a given
 * `(items, activeKey)` selects, what "Still waiting" advances to, when the
 * queue is done, and what the tray offers under its cap.
 *
 * Those are the whole of the carousel's behaviour, and none of it is reachable
 * through the component: this harness is `renderToStaticMarkup` with no DOM and
 * no effects, so a self-fetching queue cannot be clicked. The container is a
 * thin render of these functions precisely so they can be pinned here.
 *
 * The one render test mocks `useRequestsQueue` — the established pattern for
 * this directory (`mixedStream.test.tsx` does the same to `useUpdates`) — and
 * proves the queue mounts the SHIPPED faction chassis rather than the seven
 * bespoke cards the design hand-draws (epic #1419 decision 15).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import {
  QUEUE_ITEM_TYPES,
  TRAY_CAP,
  isQueueDone,
  isQueueItem,
  nextQueueKey,
  previousQueueKey,
  queueItems,
  selectQueueIndex,
  selectQueueTray,
} from '../requestsQueue'
import type { RequestsQueueState } from '../useRequestsQueue'

const mocks = vi.hoisted(() => ({ state: null as unknown }))
vi.mock('../useRequestsQueue', () => ({ useRequestsQueue: () => mocks.state }))

// Imported after the mock is registered.
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

  it('refuses a mention — news about you is not a request of you', () => {
    // Ruled by the codebase before this epic existed
    // (`normalizeFeedItem.ts`), and re-ruled as epic #1419 decision 8. Its only
    // action is "Reply", so not replying owes nobody an answer.
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
    // The whole of "answering advances" is this line. The answered item is gone
    // from the next fetch, so its key no longer resolves and the queue lands on
    // what is still waiting. No resolved-set, no optimistic removal.
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
  it('is reached only when every obligation is answered', () => {
    expect(isQueueDone([])).toBe(true)
    expect(isQueueDone(TEN)).toBe(false)
  })

  it('is NOT reached by skipping through the whole queue', () => {
    // Ten skips is a full lap, and a lap changes nothing about the world.
    let cursor: string | null = null
    for (let step = 0; step < TEN.length; step += 1) {
      cursor = nextQueueKey(TEN, cursor)
    }
    expect(cursor).toBe(TEN[0].item_key)
    expect(isQueueDone(TEN)).toBe(false)
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
    // Nine are waiting behind the card on screen; four are drawn.
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
    // Epic #1192 already ships all eight skins; the design hand-draws seven
    // bespoke queue cards and every one of them exists. The marker is COVEN's
    // own candlelit-slip token, the same one `mixedStream.test.tsx` pins.
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
    // The design's line is "No invitations, duels, mentions or submissions
    // owed" and mentions are not in the queue. #1421 authored the fixed copy.
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
