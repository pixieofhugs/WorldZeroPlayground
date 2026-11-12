import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'
import { flushPendingCast, queueCast, usePendingCast } from './pendingCasts'

/**
 * Shared vote interaction for every faction vote UI. Casts go through
 * `pendingCasts` (#1895, #3093), the cast-tally store's only writer; flushed on
 * unmount here and on navigation in `Layout`.
 *
 * No `/auth/me` refetch: a cast only moves the voter's vote budget (anti-self-
 * vote keeps them off the members), which is enforced server-side (ADR-0043)
 * and read by nothing here.
 */
export function useVote(praxisId: number, currentValue?: number) {
  const { t } = useTranslation('votes')
  const { user } = useAuth()
  // Not seeded from `currentValue`, so a payload arriving after mount still
  // pre-highlights.
  const pending = usePendingCast(praxisId)
  const selected = pending?.value ?? currentValue ?? 0
  // Never disabled for a request (#3093): it would drop focus and block a
  // mid-flight change of mind, which `pendingCasts` handles.
  //
  // ponytail: `saving` is an inert constant the nine controls still read;
  // drop it in a nine-file sweep when those files are open anyway.
  const saving = false
  const error =
    pending?.failure == null ? '' : extractError(pending.failure, t('chrome.saveError'))

  // Leaving (or switching praxis) must not lose a queued vote.
  useEffect(() => () => flushPendingCast(praxisId), [praxisId])

  const vote = (stars: number) => {
    queueCast(
      praxisId,
      stars,
      user?.character
        ? {
            character_id: user.character.id,
            display_name: user.character.display_name,
            avatar_url: user.character.avatar_url,
            faction_slug: user.character.faction_slug,
          }
        : null,
    )
  }

  return { user, selected, saving, error, vote }
}
