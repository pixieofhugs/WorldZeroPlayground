import { getGameConfig } from '../api/gameConfig'
import { createCachedResource } from './cachedResource'

/**
 * Hook to fetch and cache the current era game config.
 *
 * Fetched once and shared across all consumers — N components mounting in the
 * same paint cost one `/game-config` request, and navigating between pages
 * costs none.
 *
 * **Staleness bound: 5 minutes** (`CACHE_TTL_MS`). The cache used to be
 * written once and never cleared, so an era transition mid-session served stale
 * rules until a reload (#1284). There is no push channel from the server, so
 * the client cannot be told the era rolled over; instead each entry is stamped
 * when it resolves and the first consumer to mount past the bound refetches.
 * The policy lives in `cachedResource.ts` and is shared verbatim with
 * `useFactions` — one cache story, not two.
 *
 * Returns `null` until the first response lands.
 */
export const useGameConfig = createCachedResource(getGameConfig)
