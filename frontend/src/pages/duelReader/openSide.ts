/**
 * Which side's panel lands OPEN on the phone reader (#1084). Owner ruling
 * 2026-09-01: **whoever is behind** — anti-bandwagon, since the standing above
 * already says who leads and voting is still open (ADR-0052).
 *
 * | situation | opens |
 * |---|---|
 * | `settled`, one side ahead | the side that is BEHIND — the ruling |
 * | `settled`, exact tie | the arrived-from side |
 * | `resolved` | the arrived-from side |
 * | forfeit | the arrived-from side |
 * | no-contest | the arrived-from side |
 * | deep link, no arrived-from side | the challenger |
 *
 * Resolved and forfeit fall back: with no voting left, always opening the loser
 * would read as editorial. Forfeit is checked BEFORE the standing because a
 * forfeited side still carries `points_from_votes`.
 */
import type { DuelDetailOut } from '../../api/duel'

/** The two sides, by the names the payload gives them. */
export type DuelSideKey = 'challenger' | 'opponent'

/** `arrivedFrom` is `null` on a deep link. */
export function openSideFor(
  duel: DuelDetailOut,
  arrivedFrom: DuelSideKey | null,
): DuelSideKey {
  const fallback: DuelSideKey = arrivedFrom ?? 'challenger'

  if (duel.forfeited_by_character_id !== null) return fallback

  if (duel.status !== 'settled') return fallback

  const challenger = duel.challenger.points_from_votes
  const opponent = duel.opponent.points_from_votes
  if (challenger === opponent) return fallback

  return challenger < opponent ? 'challenger' : 'opponent'
}
