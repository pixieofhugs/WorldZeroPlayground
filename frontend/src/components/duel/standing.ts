/**
 * A duel's figures and its one verdict sentence — the arithmetic and the copy
 * selection, in one place for both surfaces that read a settled duel out.
 *
 * Extracted from `pages/praxisDetail/DuelCard.tsx` for #1084, whose side-by-side
 * reader draws the same standing over the same catalog keys. The issue's own
 * instruction is *"reuse, do not re-derive"*, and #2814's whole thesis is that
 * a rule written twice drifts — this is that rule, so it is written once.
 *
 * ### The one difference between the two callers, and why it is a PARAMETER
 *
 * `DuelCard` is viewer-relative: it reads `mine` / `rival` off `sidesForPraxis`
 * and the standing names them from the viewer's seat. The side-by-side reader is
 * deliberately NOT — its two columns are identical in kind and *"nothing belongs
 * to one duellist more than the other"*, so it passes `challenger` / `opponent`.
 *
 * Both are the same computation over two sides in a chosen reading order, so the
 * order is an argument rather than a branch. Nothing here knows who is looking.
 */
import type { TFunction } from 'i18next'
import type { DuelDetailOut, DuelSideOut } from '../../api/duel'
import { formatPoints } from '../../utils/points'

/** The em-dash a side with no figure shows. */
export const NO_SCORE = '—'

/** The frozen total for one side, or `null` where the payload has none. */
function finalFor(duel: DuelDetailOut, side: DuelSideOut): number | null {
  return side.character_id === duel.challenger.character_id
    ? duel.challenger_final_points
    : duel.opponent_final_points
}

/** True when this side threw the duel. */
export function hasForfeited(duel: DuelDetailOut, side: DuelSideOut): boolean {
  return (
    duel.forfeited_by_character_id != null &&
    side.character_id === duel.forfeited_by_character_id
  )
}

/**
 * A side's total, or the em-dash where it has none.
 *
 * A forfeiter's total is absent by rule, checked BEFORE the frozen pair because
 * a forfeit survives era close. `formatPoints` rather than a local `toFixed`:
 * this figure sits on the same page as `ScoreStamp`'s total and has to read the
 * same way (#1866), and a margin is the difference of two such figures.
 */
export function duelScoreFor(duel: DuelDetailOut, side: DuelSideOut): string {
  if (hasForfeited(duel, side)) return NO_SCORE
  if (duel.status === 'resolved') {
    const frozen = finalFor(duel, side)
    return frozen != null ? formatPoints(frozen) : NO_SCORE
  }
  return formatPoints(side.points_from_votes)
}

/**
 * The one verdict sentence, from the shipped `duelCrossLink.*` catalog.
 *
 * `a` and `b` are the two sides in the caller's reading order; the sentence
 * names whichever of them the standing points at. Every branch is one catalog
 * string — no sentence is assembled here.
 */
export function duelVerdict(
  duel: DuelDetailOut,
  a: DuelSideOut,
  b: DuelSideOut,
  t: TFunction<'praxis'>,
): string {
  if (duel.forfeited_by_character_id != null) {
    return t('duelCrossLink.wonByDefault')
  }

  if (duel.status === 'resolved') {
    // Either figure may be null on a no-contest — a duel that never became
    // votable — in which case there is no pair to print and the line says so.
    const pair = finalFor(duel, a) != null && finalFor(duel, b) != null
    if (!pair) return t('duelCrossLink.finalNoContest')
    return t('duelCrossLink.final', {
      standing:
        duel.winner_character_id == null
          ? t('duelCrossLink.finalStanding.tied')
          : t('duelCrossLink.finalStanding.won', {
              name:
                duel.winner_character_id === a.character_id
                  ? a.display_name
                  : b.display_name,
            }),
    })
  }

  const margin = a.points_from_votes - b.points_from_votes
  return t('duelCrossLink.live', {
    standing:
      margin === 0
        ? t('duelCrossLink.standing.tied')
        : t('duelCrossLink.standing.leads', {
            name: margin > 0 ? a.display_name : b.display_name,
            margin: formatPoints(Math.abs(margin)),
          }),
  })
}
