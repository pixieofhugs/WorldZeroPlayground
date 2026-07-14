import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { castVote } from '../../api/votes'
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'

/**
 * Shared vote interaction for all per-faction vote UIs. Faction variants render
 * the 1-5 control however they like (stamps, hearts, …) and drive it from this
 * hook so the cast/refetch logic lives in exactly one place.
 */
export function useVote(praxisId: number, currentValue?: number) {
  const { t } = useTranslation('votes')
  const { user, refetch } = useAuth()
  const [selected, setSelected] = useState(currentValue ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const vote = async (stars: number) => {
    setSaving(true)
    setError('')
    try {
      await castVote(praxisId, stars)
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
