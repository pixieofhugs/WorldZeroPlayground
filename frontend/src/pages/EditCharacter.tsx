/**
 * Edit-character dispatcher (#2537). The slug is the EDITED character's, not
 * the viewer's; undefined until it loads, so the Default draws (matching its
 * own loading state). `''`/`na`/unknown resolve to the `na` kit, never UA
 * (#796). Archetypes handle form factor themselves.
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
