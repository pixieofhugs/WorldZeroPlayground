import api from './axios'
import { noteEraStamp } from '../utils/cacheEpoch'

// Faction name/description prose moved to the factions.json catalog (issue
// #461); /game-config emits only the slug + numeric rules. Resolve display copy
// with factionName(slug) / factionDescription(slug) from utils/factions.
export interface FactionConfigOut {
  slug: string
  own_task_modifier: number
  other_task_modifier: number
  collab_own_modifier: number
  collab_other_modifier: number
  duel_win_modifier: number
  duel_loss_modifier: number
}

export type LevelUnlockKind = 'ability' | 'sense'

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
  max_task_signups: number
  factions: FactionConfigOut[]
  level_profiles: LevelProfile[]
}

export async function getGameConfig(): Promise<GameConfigOut> {
  const { data } = await api.get<GameConfigOut>('/game-config')
  // The era stamp: if this disagrees with the era the client already saw, every
  // rule it holds describes the old world. Dropping the whole cache is the only
  // honest response, and no TTL can express it (ADR-0072).
  noteEraStamp(data.era_name)
  return data
}
