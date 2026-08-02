import { useGameConfig } from './useGameConfig'
import { levelTrack, type LevelTrack } from '../utils/levelTrack'

/**
 * The carried life's progress toward its next level (#1553), read off the live
 * era's `level_thresholds` rather than a curve copied into a component.
 *
 * Returns `null` until `/game-config` lands — the surfaces render the era-points
 * figure regardless and hold the track back, which is honest about not yet
 * knowing the target. `useGameConfig` is a shared cached resource, so the two
 * homes that call this cost one request between them.
 */
export function useLevelTrack(level: number, score: number): LevelTrack | null {
  const gameConfig = useGameConfig()
  if (!gameConfig) return null
  return levelTrack(level, score, gameConfig.level_thresholds)
}
