import { apiGet } from './client'
import type { ActivityFeedItem } from './activityFeed'
import type { PraxisCardOut } from './praxis'

/**
 * The rail's three data panels, from one request (#1344).
 *
 * Deliberately carries no identity. The character card reads `user.character`
 * off `/auth/me`, which ~20 call sites already refetch — folding these panels
 * into that payload would make every one of those refetches heavier (#1349).
 */
export interface SidebarPanels {
  /**
   * How many unanswered requests are waiting — collab invites, duel challenges,
   * your own outstanding submissions and faction invitation letters.
   *
   * A number, not a list (#1456). The rail listed these until #1423; the queue
   * on `/updates` owns the cards now (ADR-0070), so every consumer left — the
   * collapsed handle's badge, the mobile bell, the mobile FieldDesk — wanted
   * only `.length`. It is the same number the queue's own `counts.requests`
   * reports, so the badge and the card list cannot disagree.
   */
  pending_requests_count: number
  /**
   * The rail's "Recent activity" panel: the viewer's whole LIVE feed minus the
   * obligations, newest first, capped at five (#1556).
   *
   * It was the `global` tab alone until #1556 — new tasks and era announcements
   * — which is why the wire field is still called `global_activity`. It now
   * carries votes on your praxes, friend and foe completions, taunts, nudges
   * and mentions as well.
   *
   * The exclusion is exactly the one the Requests queue is built from
   * (ADR-0070): the server asks `_visible_types` for the live `all` view, the
   * same call the queue makes, so the panel and the queue partition the feed
   * and no item can land in both or neither. The name is kept deliberately —
   * renaming a field the rail reads on every route is a deploy-skew hazard, and
   * a frontend ahead of its API would read `undefined` here and white-page the
   * whole site rather than just this panel.
   */
  global_activity: ActivityFeedItem[]
  /**
   * How many items `global_activity` is a five-item glance OF (#1587).
   *
   * Free, and that is the point: the server already fetched every row to build
   * the glance and threw the length away with a slice. This is that length,
   * from the same fetch — so the number and the list a player reaches by
   * tapping it cannot disagree (ADR-0036), and `/me/sidebar` issues no extra
   * statement for it.
   *
   * A FLOOR above {@link ACTIVITY_COUNT_CAP}; exact below it. Render it through
   * that constant's rule, never raw.
   *
   * DEPLOY SKEW: this field is newer than the rest of the response. A client
   * ahead of its API reads `undefined` here — the very case the
   * `global_activity` note above describes — so every reader must fall back to
   * wording that needs no number rather than printing one it was not sent. The
   * type says `number` because the contract says required; the fallback is for
   * the minutes when the deployed API is older than the deployed client.
   */
  global_activity_count: number
  /** In-progress praxes the carried character is a MEMBER of (so accepted
   *  collab invites count), which is also what the slot bar counts. */
  active_praxes: PraxisCardOut[]
}

/**
 * Above this, `global_activity_count` is a floor rather than a total — show
 * "50+", not "137".
 *
 * It is the server's `SUB_QUERY_LIMIT`: every feed source stops at that many
 * rows, so a sum BELOW it is provably exact (no single source can have hit its
 * cap while the sum is under it) and a sum at or above it may be short.
 *
 * The value is duplicated across a language boundary, so it is pinned rather
 * than commented: `__tests__/activityCountCap.test.ts` reads the Python
 * constant and fails if the two drift.
 */
export const ACTIVITY_COUNT_CAP = 50

/**
 * Fetch all three panels.
 *
 * Takes no arguments on purpose: the route resolves the viewer from the JWT, so
 * there is nothing for the client to pass and therefore nothing to wait for.
 * That is what lets `SidebarProvider` fire it in the first wave, alongside
 * `/auth/me` rather than behind it.
 *
 * Rejects with 401 for a guest. That is an answer, not a failure — see
 * `SESSION_PROBES` in `./sessionRedirect`.
 */
export async function getSidebar(): Promise<SidebarPanels> {
  const { data } = await apiGet('/me/sidebar')
  return data
}
