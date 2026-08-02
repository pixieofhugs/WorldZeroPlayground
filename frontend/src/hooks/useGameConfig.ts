import { getGameConfig } from '../api/gameConfig'
import { createCachedResource, SESSION_TTL_MS } from './cachedResource'

/**
 * Hook to fetch and cache the current era game config.
 *
 * Fetched once and shared across all consumers — N components mounting in the
 * same paint cost one `/game-config` request, and navigating between pages
 * costs none.
 *
 * **Class A — deploy-scoped; the bound is the session** (`SESSION_TTL_MS`,
 * ADR-0072). This endpoint touches no database at all: it serialises the
 * `CURRENT_ERA` module constant (#1283), so its answer can only change when the
 * process restarts. A five-minute bound was not conservative here, it was
 * meaningless — nothing it re-read could ever differ.
 *
 * The era transition that used to be served stale until a reload (#1284) is
 * still answered, but by the right instrument: `getGameConfig()` reports its
 * `era_name` to `utils/cacheEpoch`, and a disagreement drops the whole cache.
 * That is a version key, not a bound — no TTL can say "everything is wrong now".
 *
 * Returns `null` until the first response lands.
 */
export const useGameConfig = createCachedResource(getGameConfig, SESSION_TTL_MS)
