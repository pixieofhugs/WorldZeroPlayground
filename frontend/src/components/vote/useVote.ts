import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { castVote } from '../../api/votes'
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'
import { recordVote, viewerVote } from './voteOverrides'

/**
 * Shared vote interaction for all per-faction vote UIs. Faction variants render
 * the 1-5 control however they like (stamps, hearts, …) and drive it from this
 * hook so the cast/refetch logic lives in exactly one place.
 *
 * A cast also publishes a tally override (#626): the card's score hero and
 * footer read the praxis object, which this hook cannot reach, so local state
 * alone would leave those numbers stale until a reload. This is the override
 * store's ONLY writer.
 */
export function useVote(praxisId: number, currentValue?: number) {
  const { t } = useTranslation('votes')
  const { user, refetch } = useAuth()
  // Praxis detail pages don't pass currentValue (PraxisOut carries no
  // viewer_vote), so fall back to what the store knows — seeded there from the
  // voters list, which does carry it.
  const [selected, setSelected] = useState(currentValue ?? viewerVote(praxisId) ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const vote = async (stars: number) => {
    setSaving(true)
    setError('')
    try {
      await castVote(praxisId, stars)
      recordVote(praxisId, stars, currentValue ?? viewerVote(praxisId) ?? null)
      setSelected(stars)
      // Refresh sidebar character stats (score/level may have changed)
      void refetch()
    } catch (err) {
      setError(extractError(err, t('chrome.saveError')))
    } finally {
      setSaving(false)
    }
  }

  return { user, selected, saving, error, vote }
}
