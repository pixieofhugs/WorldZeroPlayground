/**
 * #2220 — an archive write that moves the bell's number must ring the requests
 * bus. `pending_requests_count` is ADR-0072 class C, held above the router, so
 * a missed ring survives navigation until a hard reload. Fixed here, in the
 * one module all archive writes route through, not in one of five readers.
 *
 * Gated on item type: a bus event refetches `useUpdates`' items and would
 * sweep away the undo strip in the archived card's slot. Only request types
 * move the bell, and they never appear in the live stream (ADR-0070).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  dismissAllFeedItems,
  dismissFeedItem,
  restoreAllFeedItems,
  restoreFeedItem,
} from '../activityFeed'
import { onRequestsChanged } from '../../utils/requestsBus'

/** Hoisted fetch stub: see `client.test.ts`. */
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
