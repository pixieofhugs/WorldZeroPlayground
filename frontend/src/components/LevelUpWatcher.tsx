import { lazy, Suspense, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useGameConfig } from '../hooks/useGameConfig'

/** Lazy: the popup almost never shows, so keep it off first paint (#2843). Guarded by `eagerPathImports.test.ts`. */
const LevelUpPopup = lazy(() => import('./LevelUpPopup'))

export const LAST_SEEN_LEVEL_KEY_PREFIX = 'wz:lastSeenLevel:'

export function lastSeenLevelKey(characterId: number): string {
  return `${LAST_SEEN_LEVEL_KEY_PREFIX}${characterId}`
}

interface LevelDiff {
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

/** Mounted once in Layout. Level-ups come from others' votes (no client event), so diff
 * per character in localStorage; one popup per level crossed. */
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
    // No spinner: arriving a chunk-fetch late is invisible; a flashed loader isn't.
    <Suspense fallback={null}>
      <LevelUpPopup
        level={level}
        rankKey={profile.rank_key}
        abilities={profile.unlocks}
        onContinue={() => setQueue((prev) => prev.slice(1))}
      />
    </Suspense>
  )
}
