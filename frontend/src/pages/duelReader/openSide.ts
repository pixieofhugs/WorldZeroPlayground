/**
 * Which side's panel lands OPEN on the phone reader (#1084).
 *
 * The phone view stacks the two entries and opens exactly one, so the reader is
 * never half-reading both. Which one is an owner ruling, 2026-09-01:
 *
 * > **Whoever is behind.**
 *
 * The reason is the part that has to survive: the standing sits above both
 * panels and has ALREADY told the reader who is ahead. Opening the leader means
 * the page argues the case for the entry it just said was winning. Opening the
 * one who is behind means the reader reads the case they have not been sold —
 * anti-bandwagon, on a surface whose whole premise is that voting is open and
 * nothing is decided (ADR-0011 / ADR-0052).
 *
 * ### "Behind" is undefined in four of the five situations this surface draws
 *
 * The reader is only ever mounted on `settled` and `resolved` (the same pair
 * `DuelCard` draws), and only one of those has a live standing to be behind in.
 * The tail below was ruled with the head, on the same day:
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
 * **`resolved` and forfeit fall back rather than opening the loser** because the
 * ruling's reason is anti-bandwagon *while voting is open*. Once the era closes
 * there is nothing left to cast — the resolved artboard removes both vote panels
 * rather than disabling them — so opening the loser every time would read as
 * editorial rather than fair. The arrived-from side keeps it continuous with
 * the page the reader just came from — which is the only continuity claim this
 * fallback makes.
 *
 * It used to say "continuous with the ground, which is already that side's
 * faction", and that is NOT how the ground resolved: the frame wears the TASK's
 * faction, which is the same for both duellists, so the arrived-from side moves
 * no colour at all. The fallback stands on its own reason and never needed that
 * one.
 *
 * A forfeit is checked BEFORE the standing because a forfeited side still
 * carries a `points_from_votes` figure; the surface draws an em-dash over it and
 * "behind" stops meaning anything.
 */
import type { DuelDetailOut } from '../../api/duel'

/** The two sides, by the names the payload gives them. */
export type DuelSideKey = 'challenger' | 'opponent'

/**
 * The side whose panel starts expanded.
 *
 * `arrivedFrom` is the side whose praxis page the reader was opened from, or
 * `null` on a deep link straight to the duel route.
 */
export function openSideFor(
  duel: DuelDetailOut,
  arrivedFrom: DuelSideKey | null,
): DuelSideKey {
  // The whole tail of the ruling collapses to this one value.
  const fallback: DuelSideKey = arrivedFrom ?? 'challenger'

  if (duel.forfeited_by_character_id !== null) return fallback

  // `resolved` and every state that is not a live standing. The reader is not
  // mounted on the others at all, so this is a guard rather than a branch.
  if (duel.status !== 'settled') return fallback

  const challenger = duel.challenger.points_from_votes
  const opponent = duel.opponent.points_from_votes
  if (challenger === opponent) return fallback

  return challenger < opponent ? 'challenger' : 'opponent'
}
