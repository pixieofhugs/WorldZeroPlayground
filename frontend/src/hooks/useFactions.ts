import { getFactions } from '../api/factions'
import { createCachedResource, SESSION_TTL_MS } from './cachedResource'

/**
 * Visible faction slugs, app-wide, one request per page load (#1284).
 *
 * Class A, session-bound (ADR-0072): a new slug needs a deploy to be drawable;
 * the Albescent reveal is a viewer mutation and `chooseFaction()` drops the cache.
 *
 * NOT `useGameConfig()?.factions`, which is every configured faction (incl. `na`
 * and hidden) with modifiers and no visibility. `null` until the first response.
 */
export const useFactions = createCachedResource(getFactions, SESSION_TTL_MS)
