import api from './axios'

export interface FactionConfigOut {
  slug: string
  name: string
  description: string
  is_selectable: boolean
  can_always_rejoin: boolean
  own_task_modifier: number
  other_task_modifier: number
  collab_own_modifier: number
  collab_other_modifier: number
  duel_win_modifier: number
  duel_loss_modifier: number
}

export interface GameConfigOut {
  era_name: string
  level_thresholds: number[]
  max_task_signups: number
  vote_budget_base: number
  vote_budget_multiplier: number
  factions: FactionConfigOut[]
}

export async function getGameConfig(): Promise<GameConfigOut> {
  const { data } = await api.get<GameConfigOut>('/game-config')
  return data
}
