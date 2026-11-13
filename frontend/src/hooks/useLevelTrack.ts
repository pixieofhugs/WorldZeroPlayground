import { useGameConfig } from './useGameConfig'
import { levelTrack, type LevelTrack } from '../utils/levelTrack'

/** Progress toward the next level from the live era's `level_thresholds` (#1553); `null` until config lands. */
export function useLevelTrack(level: number, score: number): LevelTrack | null {
  const gameConfig = useGameConfig()
  if (!gameConfig) return null
  return levelTrack(level, score, gameConfig.level_thresholds)
}
