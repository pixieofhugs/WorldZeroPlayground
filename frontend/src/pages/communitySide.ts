/** Which Community side the phone used last (#3761); per browser. */
export type CommunitySide = 'players' | 'factions'

export const COMMUNITY_SIDE_KEY = 'wz-community-side'

export const sideHref = (side: CommunitySide): string => (side === 'factions' ? '/factions' : '/leaderboard')

export function rememberSide(side: CommunitySide): void {
  try {
    localStorage.setItem(COMMUNITY_SIDE_KEY, side)
  } catch {
    // Storage refused: the tab falls back to Players.
  }
}

/** Where the Community tab points: the remembered side, Players by default. */
export function communityHref(): string {
  try {
    return sideHref(localStorage.getItem(COMMUNITY_SIDE_KEY) === 'factions' ? 'factions' : 'players')
  } catch {
    return sideHref('players')
  }
}
