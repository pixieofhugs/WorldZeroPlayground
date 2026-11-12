import { useState } from 'react'
import type { ActivityFeedItem } from '../api/activityFeed'
import { respondToInvite } from '../api/praxis'
import { respondToChallenge } from '../api/duel'
import { extractError } from '../utils/errors'

/**
 * Accept/decline for collab invites and duel challenges (#346): different
 * endpoints and payload fields, so this is the one place that knows the switch.
 */

type RequestResponseStatus = 'pending' | 'accepted' | 'declined'

/** Duels report 'active'/'settled' once accepted; both map to 'accepted'. */
export function normalizeRequestStatus(
  raw: string | null | undefined,
): RequestResponseStatus {
  if (raw === null || raw === undefined || raw === 'pending') return 'pending'
  if (raw === 'declined') return 'declined'
  return 'accepted'
}

/** Untyped payload read optionally: malformed → 'pending', not a render throw. */
export function requestStatusOf(item: ActivityFeedItem): RequestResponseStatus {
  const raw =
    item.type === 'duel_challenge'
      ? item.payload?.duel_status
      : item.payload?.invite_status
  return normalizeRequestStatus(raw)
}

/** Returns the praxis to land on (shared collab / new opponent praxis); null on duel decline. */
export async function respondToRequest(
  item: ActivityFeedItem,
  accept: boolean,
): Promise<number | null> {
  switch (item.type) {
    case 'collab_invite': {
      const { praxis_id, invite_id } = item.payload
      await respondToInvite(praxis_id, invite_id, accept)
      return praxis_id
    }
    case 'duel_challenge': {
      const duel = await respondToChallenge(item.payload.duel_id, { accept })
      return duel.opponent_praxis_id
    }
    default:
      throw new Error(`Not a respondable request type: ${item.type}`)
  }
}

interface RespondResult {
  ok: boolean
  praxisId: number | null
  /** Raw backend `detail` on failure, e.g. to detect bank-full (#314). */
  detail?: string
}

export function useRespondToRequest(item: ActivityFeedItem) {
  const [status, setStatus] = useState<RequestResponseStatus>(() =>
    requestStatusOf(item),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const respond = async (acceptRequest: boolean): Promise<RespondResult> => {
    setLoading(true)
    setError('')
    try {
      const praxisId = await respondToRequest(item, acceptRequest)
      setStatus(acceptRequest ? 'accepted' : 'declined')
      return { ok: true, praxisId }
    } catch (err) {
      // Surface the real backend reason (#318).
      const noun = item.type === 'duel_challenge' ? 'duel' : 'invite'
      const verb = acceptRequest ? 'accept' : 'decline'
      const message = extractError(
        err,
        `Could not ${verb} ${noun}. Please try again.`,
      )
      setError(message)
      return { ok: false, praxisId: null, detail: message }
    } finally {
      setLoading(false)
    }
  }

  const accept = () => respond(true)
  const decline = () => respond(false)

  return { accept, decline, loading, status, error } as const
}
