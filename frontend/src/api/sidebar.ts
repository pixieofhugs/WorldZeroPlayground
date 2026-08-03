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
  /** In-progress praxes the carried character is a MEMBER of (so accepted
   *  collab invites count), which is also what the slot bar counts. */
  active_praxes: PraxisCardOut[]
}

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
