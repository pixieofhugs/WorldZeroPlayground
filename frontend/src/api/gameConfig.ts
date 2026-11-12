import { apiGet } from './client'
import type { components } from './generated/schema'
import { noteEraStamp } from '../utils/cacheEpoch'

// Words via factionName/factionDescription in utils/factions (#461).
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

// ADR-0031: copy KEYS; words in progression.json (`unlocks.<key>.name|desc`, `ranks.<rankKey>`).
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
  /** Hours a fresh proposal stays admin-only (#1695). */
  pending_task_admin_review_hours: number
  max_task_signups: number
  factions: FactionConfigOut[]
  level_profiles: LevelProfile[]
}

export async function getGameConfig(): Promise<GameConfigOut> {
  const { data } = await apiGet('/game-config')
  // Era stamp: a mismatch drops the whole cache (ADR-0072).
  noteEraStamp(data.era_name)
  return data as GameConfigOut
}
