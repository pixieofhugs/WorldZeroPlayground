import { getFactions } from '../api/factions'
import { createCachedResource } from './cachedResource'

/**
 * The `/factions` directory — the visible faction slugs, app-wide.
 *
 * Five surfaces read this list (tasks, praxes, the factions directory, a
 * faction detail page, propose-task) and each used to fire its own request, so
 * `/factions` cost a round trip on **every** SPA navigation (#1284). One
 * request per page load now covers all five.
 *
 * **Staleness bound: 5 minutes** (`CACHE_TTL_MS`) — the same policy, from the
 * same module, as `useGameConfig`. An admin flipping a faction's visibility
 * surfaces on the first navigation after the bound, without a reload.
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
export const useFactions = createCachedResource(getFactions)
