import { getFactions } from '../api/factions'
import { createCachedResource, SESSION_TTL_MS } from './cachedResource'

/**
 * The `/factions` directory — the visible faction slugs, app-wide.
 *
 * Five surfaces read this list (tasks, praxes, the factions directory, a
 * faction detail page, propose-task) and each used to fire its own request, so
 * `/factions` cost a round trip on **every** SPA navigation (#1284). One
 * request per page load now covers all five.
 *
 * **Class A — deploy-scoped; the bound is the session** (`SESSION_TTL_MS`,
 * ADR-0072). The endpoint does read the database, but a faction the bundle has
 * never heard of cannot be drawn: a new slug needs its `utils/factions` entry,
 * its CSS variables and its `factions.json` copy, and all three ship with a
 * deploy. The one thing that changes mid-session is the Albescent reveal, and
 * that is a mutation the viewer performs — `chooseFaction()` drops the cache —
 * not something a timer should be relied on to notice.
 *
 * NOT interchangeable with `useGameConfig()?.factions`: `/factions` returns the
 * VISIBLE factions (slug only), while game-config returns every configured
 * faction (including `na` and hidden ones) with its scoring modifiers and no
 * visibility at all. Different sets, different fields, neither derivable from
 * the other.
 *
 * Returns `null` until the first response lands; call sites that want an empty
 * list while it settles do `useFactions() ?? []`.
 */
export const useFactions = createCachedResource(getFactions, SESSION_TTL_MS)
