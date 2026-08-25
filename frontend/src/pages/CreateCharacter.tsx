/**
 * Character-creation dispatcher (#2346).
 *
 * Adaptive Character Creation (#273, ADR-0019) is unchanged underneath: one
 * screen, one submit path, and a faction picker that appears iff the account
 * holds invitations — otherwise a brand-new account creates a born-unaffiliated
 * ("na") life. What #2346 adds is the DRESS.
 *
 * THE SLUG IS THE PICK IN PROGRESS, WHICH IS WHY THIS PAGE IS UNUSUAL. Every
 * other dispatcher reads a faction off a loaded record — the task's, the
 * praxis's, the profile's. There is no record here and no character yet, so the
 * slug is `state.factionSlug`: the calling being chosen RIGHT NOW, held in
 * `useCreateCharacter`. The page therefore RESKINS LIVE as the pick changes and
 * returns to Default the moment it is cleared, which is what its own heading
 * already asks ("Who are you becoming?"). No route change, no new plumbing —
 * the preview card was already reading this same value.
 *
 * `''` (born unaffiliated) and any unregistered slug resolve to
 * `DefaultCreateCharacter`, the `na` kit — never UA and never the viewer's own
 * faction. `pickVariant` has no cross-faction path at all, which is the guard
 * `FactionSelectCard` did not have when its `UaSelectCard` fallback "dressed
 * every unaffiliated and unknown slug in UA's costume" (#796, the third instance
 * of #418/#636).
 *
 * ONE ARCHETYPE PER FACTION AT BOTH WIDTHS. There is no form factor to branch on
 * here: each archetype calls `useFormFactor()` itself, so the mobile-only
 * `mobileCreateCharacter` slot stays retired and the phone column is a branch
 * INSIDE `DefaultCreateCharacter` rather than a second file beside it.
 */
import { useCreateCharacter } from './characterPaths/useCreateCharacter'
import { resolveVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'

export default function CreateCharacter() {
  const state = useCreateCharacter()
  const Archetype = resolveVariant(
    surfaceMap('createCharacter'),
    state.factionSlug,
  )
  return <Archetype state={state} />
}
