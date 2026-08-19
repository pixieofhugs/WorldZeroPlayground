/**
 * #2288 — joining a faction ANSWERS an obligation, so it must say so on the
 * requests bus.
 *
 * THE SEAM
 * --------
 * `api/factions.ts`'s `chooseFaction()`, the one place all four join surfaces
 * route through: the feed card, the invitation popup, the Albescent
 * invitation, and the faction detail page's own button.
 *
 * WHY THE JOIN MOVES THE BELL AT ALL
 * ----------------------------------
 * Two invitation letters change meaning in the same write, and both are
 * `invitation_letter` rows the bell counts:
 *
 *   - the TARGET faction's letter stops being a request, because ADR-0070
 *     reads "answered" off the character and standing in that faction IS the
 *     acceptance (`_invitation_letters_query`);
 *   - the LEFT faction's letter is deleted outright, because you cannot rejoin
 *     what you walked out of (#2218, `defect_to_faction`).
 *
 * So the server's `pending_requests_count` drops the moment the join lands.
 *
 * WHY THE CLIENT DOES NOT NOTICE
 * ------------------------------
 * `pending_requests_count` is ADR-0072's class C — invalidated on mutation via
 * `utils/requestsBus`, never aged out — and `SidebarProvider` holds it ABOVE
 * the router. Its only other refetch trigger compares the CHARACTER ID (#1390),
 * which a faction change does not move. So without a bus event the stale count
 * survives every client-side navigation and dies only on a hard reload: the
 * mobile bell reads 1 while `/updates`, which fetches fresh, says "Nothing is
 * waiting on you." That is #2288's screenshot, both halves on one screen.
 *
 * Exactly the defect #2220 fixed for the archive writes
 * (`archiveNotifiesRequestsBus.test.ts`), one write site over. Three of the four
 * join call sites never fired the bus; fixing it in `chooseFaction` fixes the
 * number rather than one of five readers.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { chooseFaction } from '../factions'
import { onRequestsChanged } from '../../utils/requestsBus'

/**
 * `openapi-fetch` binds `globalThis.fetch` when the client is created — at
 * `../client`'s top level, during this file's imports — so the stub has to be
 * in place before them. Same hoist as `archiveNotifiesRequestsBus.test.ts`.
 */
vi.hoisted(() => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ id: 1, character: { id: 7, faction_slug: 'ua' } }), {
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

describe('joining a faction', () => {
  it('fires the requests bus, so the bell re-reads the count the join just moved', async () => {
    await chooseFaction('ua')

    expect(fired).toBe(1)
  })

  it('fires once per join, from the API module rather than per call site', async () => {
    await chooseFaction('ua')
    await chooseFaction('coven')

    expect(fired).toBe(2)
  })
})
