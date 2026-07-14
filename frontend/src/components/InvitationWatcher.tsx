import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import InvitationLetterPopup from './InvitationLetterPopup'

const STORAGE_PREFIX = 'wz:seenInvites:'

export function seenInvitesKey(characterId: number): string {
  return `${STORAGE_PREFIX}${characterId}`
}

export interface InviteDiff {
  /** Slugs earned since the last observation, in stable (sorted) order. */
  toAnnounce: string[]
  /** The set to persist as last-seen (a superset of `stored`, never shrinking). */
  nextStored: string[]
}

/**
 * Pure diff between the last-seen invitation slug set and the current one.
 * `stored === null` means "never observed this character before" -> seed
 * silently (announce nothing, commit the current set) so pre-existing invites
 * never retro-fire on first load or after a character switch.
 *
 * Mirrors `diffLevel` (#287): only genuinely-new slugs announce; the stored set
 * only grows, so a slug never re-announces. Slugs are compared as a set; the
 * result is sorted for deterministic queue order.
 */
export function diffInvites(
  stored: string[] | null,
  current: string[],
): InviteDiff {
  const currentSet = [...new Set(current)].sort()
  if (stored === null) return { toAnnounce: [], nextStored: currentSet }
  const storedSet = new Set(stored)
  const toAnnounce = currentSet.filter((slug) => !storedSet.has(slug))
  // Union so the last-seen set never loses a slug (an invite can't be un-earned
  // within an era; era reset empties the source, and seed-silent handles the
  // fresh-era transition on the next observation).
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
 * Mounted once in Layout, beside LevelUpWatcher. Invitation letters are earned
 * from the same vote-driven scoring signal that drives level-ups (no
 * in-the-moment client event), so detection is a per-character localStorage diff
 * of the carried life's earned invitation slugs (from /auth/me). Queues one
 * recruitment-prospectus popup per newly-earned faction.
 */
export default function InvitationWatcher() {
  const { user } = useAuth()
  const [queue, setQueue] = useState<string[]>([])
  const character = user?.character ?? null
  const invitations = character?.invitations ?? []
  // Join on a stable key so the effect only re-runs when the set changes.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, invitesKey])

  if (queue.length === 0) return null

  return (
    <InvitationLetterPopup
      factionSlug={queue[0]}
      onClose={() => setQueue((prev) => prev.slice(1))}
    />
  )
}
