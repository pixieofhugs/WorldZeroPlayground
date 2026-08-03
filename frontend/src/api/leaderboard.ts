import { apiGet } from './client'
import type { CharacterOut } from './auth'

export async function getLeaderboard(params?: { limit?: number; offset?: number }): Promise<CharacterOut[]> {
  const { data } = await apiGet('/leaderboard', { params: { query: params } })
  return data
}
