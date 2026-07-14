import api from './axios'

export interface FactionConfigOut {
  slug: string
  name: string
  description: string
  can_always_rejoin: boolean
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
  collaboration_level_required: number
  max_task_signups: number
  vote_budget_base: number
  vote_budget_multiplier: number
  factions: FactionConfigOut[]
  level_profiles: LevelProfile[]
}

export async function getGameConfig(): Promise<GameConfigOut> {
  const { data } = await api.get<GameConfigOut>('/game-config')
  return data
}
