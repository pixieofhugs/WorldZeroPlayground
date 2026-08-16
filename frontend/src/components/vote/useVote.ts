import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'
import { flushPendingCast, queueCast, usePendingCast } from './pendingCasts'

/**
 * Shared vote interaction for all per-faction vote UIs. Faction variants render
 * the 1-5 control however they like (stamps, hearts, …) and drive it from this
 * hook so the cast logic lives in exactly one place.
 *
 * A cast publishes the tally the server returned (#1382): the card's score hero
 * and footer read the praxis object, which this hook cannot reach, so local
 * state alone would leave those numbers stale until a reload. This hook drives
 * the cast store's ONLY writer.
 *
 * THE CAST IS DEFERRED (#1895). Picking a star no longer POSTs; it queues in
 * `pendingCasts`, which sends the last choice after ~2s of quiet and shows the
 * viewer their star — and, on the detail page, their own row in the voters list
 * — for those seconds. Never the score: see that module for why the client is
 * allowed the row and not the number. The queue is flushed on unmount below and
 * on navigation in `Layout`, so leaving straight after a cast still records it.
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
  // What this viewer has chosen, if anything. Still kept separate from
  // `currentValue` rather than seeding from it, so a praxis payload that
  // arrives after first render still pre-highlights: both card and detail now
  // carry `viewer_vote` (#1382), but they do not both have it at mount. The
  // pending entry is null until the viewer actually picks a star, so that
  // property survives the move out of local state — and a re-mount now keeps
  // the star, which local state lost.
  const pending = usePendingCast(praxisId)
  const selected = pending?.value ?? currentValue ?? 0
  // Only the request itself disables the control. Disabling for the debounce
  // would forbid the change of mind the debounce exists to absorb.
  const saving = pending?.saving ?? false
  const error =
    pending?.failure == null ? '' : extractError(pending.failure, t('chrome.saveError'))

  // Leaving must not lose a queued vote. Cleanup runs on unmount and whenever
  // this control is pointed at a different praxis.
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
