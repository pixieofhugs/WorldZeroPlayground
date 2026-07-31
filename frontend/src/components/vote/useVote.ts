import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { castVote } from '../../api/votes'
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'
import { recordCastTally } from './castTallies'

/**
 * Shared vote interaction for all per-faction vote UIs. Faction variants render
 * the 1-5 control however they like (stamps, hearts, …) and drive it from this
 * hook so the cast logic lives in exactly one place.
 *
 * A cast publishes the tally the server returned (#1382): the card's score hero
 * and footer read the praxis object, which this hook cannot reach, so local
 * state alone would leave those numbers stale until a reload. This is the cast
 * store's ONLY writer.
 *
 * It deliberately does NOT refetch `/auth/me`. It used to, per star, with the
 * note "score/level may have changed" — which was never true: a cast recalculates
 * the praxis MEMBERS and anti-self-vote guarantees the voter is never one, so the
 * only thing a cast moves on the voter is their vote budget. Nothing on this
 * client reads that budget (`CharacterOut` here does not even carry the field);
 * it is enforced server-side, recomputed from spent votes on every read
 * (ADR-0043), so the next cast is always gated on live truth rather than on a
 * client copy that could go stale. `viewer_stats` on the response carries it for
 * whenever a surface does want to show it.
 */
export function useVote(praxisId: number, currentValue?: number) {
  const { t } = useTranslation('votes')
  const { user } = useAuth()
  // What this viewer has cast on this mount, if anything. Kept separate from
  // `currentValue` rather than seeding state from it, so a praxis payload that
  // arrives after first render still pre-highlights: both card and detail now
  // carry `viewer_vote` (#1382), but they do not both have it at mount.
  const [castValue, setCastValue] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selected = castValue ?? currentValue ?? 0

  const vote = async (stars: number) => {
    setSaving(true)
    setError('')
    try {
      const cast = await castVote(praxisId, stars)
      recordCastTally(praxisId, cast.tally)
      // The server's word on which star now stands, not the one we sent.
      setCastValue(cast.viewer_vote)
    } catch (err) {
      setError(extractError(err, t('chrome.saveError')))
    } finally {
      setSaving(false)
    }
  }

  return { user, selected, saving, error, vote }
}
