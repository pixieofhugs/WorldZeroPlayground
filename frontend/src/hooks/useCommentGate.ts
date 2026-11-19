import { useAuth } from '../auth/AuthContext'
import type { GameConfigOut } from '../api/gameConfig'
import { useGameConfig } from './useGameConfig'

/** Level at which the era unlocks commenting, read off the rung that lists it. */
export function commentLevelRequired(config: GameConfigOut | null): number | null {
  const level = config?.level_profiles.findIndex((p) =>
    p.unlocks.some((u) => u.kind === 'ability' && u.key === 'comment'),
  )
  return level == null || level < 0 ? null : level
}

/** The level a signed-in viewer still needs to comment, or null (can comment / unknown). */
export function useCommentGate(): number | null {
  const { user } = useAuth()
  const level = commentLevelRequired(useGameConfig())
  return user?.character && !user.can_comment ? level : null
}
