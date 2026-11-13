import type { CharacterOut } from '../api/auth'

/**
 * Does the roster have a choice to offer? (#1560) Any one suffices:
 *   - no carried life (first-life path; must never be gated or signup dead-ends);
 *   - an open create gate (not "two characters": a one-life account at the level
 *     gate must still reach the create button);
 *   - more than one life (reachable with a shut gate after an era reset).
 * `lives === null` = roster read in flight; only the first two can decide.
 *
 * Shared by the desktop roster and `CharacterSwitcherSheet` (#2111) so they agree.
 */
export function rosterOffersAChoice(
  lives: CharacterOut[] | null,
  carriesALife: boolean,
  canCreateAdditional: boolean,
): boolean {
  if (!carriesALife || canCreateAdditional) return true
  return lives !== null && lives.length > 1
}
