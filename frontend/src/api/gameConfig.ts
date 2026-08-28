import { apiGet } from './client'
import type { components } from './generated/schema'
import { noteEraStamp } from '../utils/cacheEpoch'

// Faction name/description prose moved to the factions.json catalog (issue
// #461); /game-config emits only the slug + numeric rules. Resolve display copy
// with factionName(slug) / factionDescription(slug) from utils/factions.
export type FactionConfigOut = components['schemas']['FactionConfigOut']

/**
 * ponytail: narrower than the schema, deliberately, which is why the three
 * types below it stay hand-written where the rest of `api/` became aliases in
 * #1400. The backend types `LevelUnlockOut.kind` as a bare `str`
 * (`schemas/game_config.py`), so the generated type is `string` and
 * `getGameConfig` narrows with a cast.
 *
 * Widening this to `string` would delete a real guarantee the UI branches on to
 * satisfy a backend annotation gap. Upgrade path is on the backend — make `kind`
 * a `StrEnum` so the schema carries the union — after which the cast goes and
 * `LevelUnlock` / `LevelProfile` / `GameConfigOut` can alias with it.
 */
type LevelUnlockKind = 'ability' | 'sense'

// ADR-0031: the backend emits copy KEYS; the progression.json catalog owns the
// words. Resolve with t('progression:unlocks.<key>.name' | '.desc') and
// t('progression:ranks.<rankKey>').
export interface LevelUnlock {
  kind: LevelUnlockKind
  key: string
}

export interface LevelProfile {
  rank_key: string
  unlocks: LevelUnlock[]
}

export interface GameConfigOut {
  era_name: string
  level_thresholds: number[]
  duel_level_required: number
  collab_auto_submit_days: number
  /** #1695: how long a fresh proposal stays admin-only, in hours. */
  pending_task_admin_review_hours: number
  max_task_signups: number
  factions: FactionConfigOut[]
  level_profiles: LevelProfile[]
}

export async function getGameConfig(): Promise<GameConfigOut> {
  const { data } = await apiGet('/game-config')
  // The era stamp: if this disagrees with the era the client already saw, every
  // rule it holds describes the old world. Dropping the whole cache is the only
  // honest response, and no TTL can express it (ADR-0072).
  noteEraStamp(data.era_name)
  return data as GameConfigOut
}
