import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useGameConfig } from '../hooks/useGameConfig'
import LevelUpPopup from './LevelUpPopup'

const STORAGE_PREFIX = 'wz:lastSeenLevel:'

export function lastSeenLevelKey(characterId: number): string {
  return `${STORAGE_PREFIX}${characterId}`
}

export interface LevelDiff {
  levelsToAnnounce: number[]
  nextStored: number
}

/**
 * Pure diff between the last-seen level and the current one.
 * `stored === null` means "never observed this character before" -> seed
 * silently. A drop (era reset) leaves `nextStored` at the old high-water
 * mark, so re-climbing stays silent until it's exceeded again.
 */
export function diffLevel(stored: number | null, current: number): LevelDiff {
  if (stored === null) return { levelsToAnnounce: [], nextStored: current }
  if (current <= stored) return { levelsToAnnounce: [], nextStored: stored }
  const levelsToAnnounce: number[] = []
  for (let level = stored + 1; level <= current; level++) levelsToAnnounce.push(level)
  return { levelsToAnnounce, nextStored: current }
}

/** Mounted once in Layout. Detects level-ups via a per-character localStorage
 * diff (score only changes from others voting, so there's no in-the-moment
 * event) and queues one Field Stamp popup per level crossed. */
export default function LevelUpWatcher() {
  const { user } = useAuth()
  const config = useGameConfig()
  const [queue, setQueue] = useState<number[]>([])
  const character = user?.character ?? null

  useEffect(() => {
    if (!character) return
    const key = lastSeenLevelKey(character.id)
    const raw = localStorage.getItem(key)
    const stored = raw === null ? null : Number(raw)
    const { levelsToAnnounce, nextStored } = diffLevel(stored, character.level)
    if (nextStored !== stored) localStorage.setItem(key, String(nextStored))
    if (levelsToAnnounce.length > 0) setQueue((prev) => [...prev, ...levelsToAnnounce])
  }, [character?.id, character?.level])

  if (!config || queue.length === 0) return null

  const level = queue[0]
  const profile = config.level_profiles[level]
  if (!profile) return null

  return (
    <LevelUpPopup
      level={level}
      rank={profile.rank}
      abilities={profile.unlocks}
      onContinue={() => setQueue((prev) => prev.slice(1))}
    />
  )
}
