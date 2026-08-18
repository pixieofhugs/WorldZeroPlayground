import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getMyCharacters } from '../api/me'
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
 * IT LIVES HERE, NOT IN `pages/FieldDesk`, BECAUSE THREE SURFACES ASK IT
 * (#2111). The desktop roster section is one; the other two are the
 * `CHARACTERS` trigger on the rail's character card and on all eight mobile
 * field desks, which open `CharacterSwitcherSheet` — the same roster in a
 * bottom sheet. One predicate is what stops the home modal and the FieldDesk
 * disagreeing about whether a roster is worth showing. A module with no page in
 * it is also what keeps the rail's chunk from importing the FieldDesk page.
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

/**
 * The same question for a surface that holds no roster of its own — the rail's
 * character card (#2111).
 *
 * THE ROSTER READ IS CONDITIONAL, and that is the whole reason this is a hook
 * rather than a line in `Sidebar`. Two of the three counts above are answered
 * by `/auth/me`, which every signed-in surface already has; only "more than one
 * life" needs `/me/characters`. So the request goes out for shut-gate accounts
 * only, and the rail — which mounts once per document load, not once per route
 * — costs at most one extra round trip and usually none.
 *
 * `FieldDesk` deliberately does NOT use this: it fetches the roster itself to
 * draw the cards, and passing its own `lives` to the predicate is one request
 * instead of two. The mobile skins read the answer off `FieldDeskHomeState` for
 * the same reason.
 */
export function useRosterOffersAChoice(): boolean {
  const { user } = useAuth()
  const carriesALife = Boolean(user?.character)
  const canCreateAdditional = user?.can_create_additional_character ?? false
  // True when `/auth/me` alone settles it — see the note above.
  const settledWithoutTheRoster = !carriesALife || canCreateAdditional
  const [lives, setLives] = useState<CharacterOut[] | null>(null)

  useEffect(() => {
    if (settledWithoutTheRoster) return
    // A failed read must still resolve to a KNOWN roster, as on the FieldDesk:
    // empty is the answer that hides a chooser nobody can use.
    void getMyCharacters().then(setLives).catch(() => setLives([]))
  }, [settledWithoutTheRoster])

  return rosterOffersAChoice(lives, carriesALife, canCreateAdditional)
}
