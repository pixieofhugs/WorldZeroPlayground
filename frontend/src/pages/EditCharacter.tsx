/**
 * Edit-character dispatcher (#2537) — the seam, not the dress.
 *
 * `/characters/create` has dispatched per faction since #2346; its sibling did
 * not, and there was no reason for the asymmetry. They are the same shape of
 * page — one character, one faction, one form — and a page wears a faction if
 * and only if the page as a whole resolves to exactly one. This one does.
 *
 * THE SLUG IS THE EDITED CHARACTER'S, not the viewer's. They are usually the
 * same life and not always, and the page is about the one it edits. Before the
 * record lands `character` is null, so the slug is undefined and the Default
 * draws — which is also what the Default's own loading state says, so nothing
 * flashes a faction it then takes back.
 *
 * `''` / `na` (born unaffiliated) and any unregistered slug resolve to
 * `DefaultEditCharacter`, the `na` kit — never UA and never the viewer's
 * faction. Dispatch has no cross-faction path at all, which is the guard
 * `FactionSelectCard` did not have when its `UaSelectCard` fallback "dressed
 * every unaffiliated and unknown slug in UA's costume" (#796).
 *
 * ONE ARCHETYPE PER FACTION AT BOTH WIDTHS. There is no form factor to branch on
 * here: each archetype calls `useFormFactor()` itself, so the phone column is a
 * branch INSIDE `DefaultEditCharacter` rather than a second file beside it. The
 * `formFactor === 'mobile'` early return this page used to hold, and the
 * `mobileArchetypes/` directory it imported from, are both gone with it.
 *
 * `resolveVariant`, not `pickVariant`: since #2530 `na` is a manifest row rather
 * than a hand-named third argument, so the fallback the issue's scope note spells
 * out is the registry's own and takes no parameter.
 */
import { useEditCharacter } from './characterPaths/useEditCharacter'
import { resolveVariant } from '../utils/factionDispatch'
import { surfaceMap } from '../factions'

export default function EditCharacter() {
  const state = useEditCharacter()
  const Archetype = resolveVariant(
    surfaceMap('editCharacter'),
    state.character?.faction_slug,
  )
  return <Archetype state={state} />
}
