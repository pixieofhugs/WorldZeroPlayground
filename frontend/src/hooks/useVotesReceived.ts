import { useEffect, useState } from 'react'
import { getVotesReceived } from '../api/characters'

/**
 * Votes-received count for ANY character. Re-fetches when `characterId`
 * changes; `undefined` (no carried life yet) resolves to 0 without a request.
 *
 * It was called `useMyCharacterStats` until #1524 — a name that claimed both a
 * viewer ("my") and a bundle ("stats") it never had. Renamed rather than
 * inlined into its one consumer, `useFieldDeskHome`: that hook is documented as
 * pure composition over reads someone else owns, and folding a fetch effect
 * into it would put data logic where the docblock promises none. The module
 * boundary is also the seam `fieldDeskDispatch.test.tsx` mocks to keep the
 * FieldDesk render tests off the network.
 */
export function useVotesReceived(characterId: number | undefined) {
  const [votesReceived, setVotesReceived] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (characterId === undefined) {
      setVotesReceived(0)
      setLoading(false)
      return
    }
    setLoading(true)
    getVotesReceived(characterId)
      .then((data) => setVotesReceived(data.votes_received))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [characterId])

  return { votesReceived, loading } as const
}
