import { getGameConfig } from '../api/gameConfig'
import { createCachedResource, SESSION_TTL_MS } from './cachedResource'

/**
 * Current era game config, fetched once and shared. Class A, session-bound
 * (ADR-0072): it serialises `CURRENT_ERA`. Era changes are caught by
 * `utils/cacheEpoch` via `era_name`, not a TTL. `null` until the first response.
 */
export const useGameConfig = createCachedResource(getGameConfig, SESSION_TTL_MS)
