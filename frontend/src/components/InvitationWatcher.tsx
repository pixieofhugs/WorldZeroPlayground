import { lazy, Suspense, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

/** Lazy, as `LevelUpWatcher`'s stamp (#2843); guarded by `eagerPathImports.test.ts`. */
const InvitationLetterPopup = lazy(() => import('./InvitationLetterPopup'))

export const SEEN_INVITES_KEY_PREFIX = 'wz:seenInvites:'

export function seenInvitesKey(characterId: number): string {
  return `${SEEN_INVITES_KEY_PREFIX}${characterId}`
}

interface InviteDiff {
  /** Slugs earned since the last observation, in stable (sorted) order. */
  toAnnounce: string[]
  /** The set to persist as last-seen (a superset of `stored`, never shrinking). */
  nextStored: string[]
}

/**
 * Diff last-seen vs current invitation slugs. `stored === null` seeds silently,
 * so existing invites never retro-fire. Like `diffLevel` (#287), the stored set only grows.
 */
export function diffInvites(
  stored: string[] | null,
  current: string[],
): InviteDiff {
  const currentSet = [...new Set(current)].sort()
  if (stored === null) return { toAnnounce: [], nextStored: currentSet }
  const storedSet = new Set(stored)
  const toAnnounce = currentSet.filter((slug) => !storedSet.has(slug))
  const nextStored = [...new Set([...stored, ...currentSet])].sort()
  return { toAnnounce, nextStored }
}

function readStored(key: string): string[] | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/**
 * Mounted once in Layout. Invitations are earned via others' votes (no client
 * event), so detect by a per-character localStorage diff; queue one popup each.
 */
export default function InvitationWatcher() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<string[]>([])
  const character = user?.character ?? null
  const invitations = character?.invitations ?? []
  const invitesKey = [...invitations].sort().join(',')

  useEffect(() => {
    if (!character) return
    const key = seenInvitesKey(character.id)
    const stored = readStored(key)
    const { toAnnounce, nextStored } = diffInvites(stored, character.invitations ?? [])
    const changed =
      stored === null || nextStored.length !== stored.length
    if (changed) localStorage.setItem(key, JSON.stringify(nextStored))
    if (toAnnounce.length > 0) setQueue((prev) => [...prev, ...toAnnounce])
    // Deps intentionally narrow.
  }, [character?.id, invitesKey])

  if (queue.length === 0) return null

  return (
    <Suspense fallback={null}>
      <InvitationLetterPopup
        key={queue[0]}
        factionSlug={queue[0]}
        onClose={() => setQueue((prev) => prev.slice(1))}
      />
    </Suspense>
  )
}
