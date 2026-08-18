/**
 * #2220 — an archive write that moves the bell's number must say so on the
 * requests bus.
 *
 * THE SEAM
 * --------
 * `api/activityFeed.ts`, the one place every archive write routes through.
 * `pending_requests_count` is ADR-0072's class C — an obligation, invalidated
 * on mutation via `utils/requestsBus`, never aged out — and `SidebarProvider`
 * holds it above the router. So a write that drops a request without firing the
 * bus leaves the mobile bell, NavBar's `Updates` link, the rail handle and the
 * mobile FieldDesk all showing a number that survives every client-side
 * navigation and only dies on a hard reload. That is the reported symptom, and
 * it is invisible to a typecheck: both halves compile perfectly apart.
 *
 * Fixing it in the bell component instead would fix one of five readers. Fixing
 * it here fixes the number.
 *
 * WHY THE FIRE IS GATED ON THE ITEM TYPE
 * --------------------------------------
 * `useUpdates` refetches its item list on a bus event. `FeedItemSlot` stands an
 * undo strip in the slot the archived card left, and dropping the item would
 * delete that slot — the very thing `useUpdates.refreshCounts` exists to avoid.
 * Only the request types can move the bell, and under ADR-0070 they never
 * appear in the live stream at all, so gating on the type keeps the strip and
 * still corrects the badge.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  dismissAllFeedItems,
  dismissFeedItem,
  restoreAllFeedItems,
  restoreFeedItem,
} from '../activityFeed'
import { onRequestsChanged } from '../../utils/requestsBus'

/**
 * `openapi-fetch` binds `globalThis.fetch` when the client is created — at
 * `../client`'s top level, during this file's imports — so the stub has to be
 * in place before them. See `feedQueryParams.test.ts` for the same hoist.
 */
vi.hoisted(() => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ item_key: 'x:1', archived: true, changed: true, count: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
})

let fired = 0
let unsubscribe: () => void

beforeEach(() => {
  unsubscribe?.()
  fired = 0
  unsubscribe = onRequestsChanged(() => {
    fired += 1
  })
})

describe('archiving an obligation', () => {
  it('fires the requests bus, so every reader of the count re-reads', async () => {
    await dismissFeedItem('collab_invite:42')

    expect(fired).toBe(1)
  })

  it('fires it for every request type the bell counts, not just invites', async () => {
    await dismissFeedItem('duel_challenge:7')
    await dismissFeedItem('invitation_letter:9')

    expect(fired).toBe(2)
  })

  it('fires it on restore too — putting one back raises the number', async () => {
    await restoreFeedItem('collab_invite:42')

    expect(fired).toBe(1)
  })
})

describe('archiving an ordinary activity card', () => {
  it('stays silent, so the undo strip standing in its slot is not swept away', async () => {
    await dismissFeedItem('vote_changed_on_mine:3')
    await dismissFeedItem('nudge:8')
    await restoreFeedItem('era_announcement:1')

    expect(fired).toBe(0)
  })
})

describe('the bulk writes', () => {
  it('fire unconditionally — the SERVER picks their scope, not the client', async () => {
    await dismissAllFeedItems('all')

    expect(fired).toBe(1)
  })

  it('fire on restore-all, which empties the whole archive, requests included', async () => {
    await restoreAllFeedItems()

    expect(fired).toBe(1)
  })
})
