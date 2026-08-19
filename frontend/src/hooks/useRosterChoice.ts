import type { CharacterOut } from '../api/auth'

/**
 * Does the roster have a choice to offer? (#1560)
 *
 * A chooser with one option and no way to add one is a dead end, and — worse —
 * it is a tell: it can only be read as "there is something here you cannot have
 * yet". So the roster earns its place on three counts, any one of which is
 * enough:
 *   - NO CARRIED LIFE — the account is playing nobody. This is the
 *     create-your-first-life path, and it must never be gated away or signup
 *     dead-ends, because the roster is the only way in. Asked of `CurrentUser`
 *     rather than of the count, so it holds even if the roster read is still out
 *     or comes back with a life the server will not carry.
 *   - AN OPEN GATE — "begin a new self" is a control the viewer can use.
 *   - MORE THAN ONE life — a genuine chooser, whatever the gate says. Reachable
 *     with a shut gate: an era reset drops every level.
 *
 * `lives === null` means the roster read is still in flight, so only the first
 * two — both answerable from `CurrentUser` alone — can be decided. Everyone else
 * waits, and a shut gate never flashes a heading it is about to take away.
 *
 * IT LIVES HERE, NOT IN `pages/FieldDesk`, BECAUSE TWO SURFACES ASK IT (#2111,
 * #2354). The desktop roster section is one; the other is the `CHARACTERS`
 * trigger on all eight mobile field desks, which opens `CharacterSwitcherSheet`
 * — the same roster in a bottom sheet. One predicate is what stops the sheet
 * and the FieldDesk disagreeing about whether a roster is worth showing. (The
 * rail's character card was a third until #2354 deleted its pill; the desktop
 * home behind the rail already offered the same roster on this same gate. Its
 * `useRosterOffersAChoice` wrapper — the one caller that had no roster of its
 * own and paid a conditional `/me/characters` for the answer — went with it.)
 *
 * NOT "hide until they have two characters", which was the shape the report
 * reached for: an account at the era's `second_character_level_required` with
 * one life would then reach neither the sheet nor the create button inside it,
 * and could never make a second. An open gate is a choice on its own.
 */
export function rosterOffersAChoice(
  lives: CharacterOut[] | null,
  carriesALife: boolean,
  canCreateAdditional: boolean,
): boolean {
  if (!carriesALife || canCreateAdditional) return true
  return lives !== null && lives.length > 1
}
