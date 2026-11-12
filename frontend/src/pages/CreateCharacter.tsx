/**
 * Character-creation dispatcher (#2346) over Adaptive Character Creation
 * (#273, ADR-0019). The slug is the pick IN PROGRESS (`state.factionSlug`), so
 * the page reskins live and returns to Default when cleared. `''` and unknown
 * slugs resolve to the `na` kit, never UA or the viewer's faction (#796).
 * Archetypes handle form factor themselves.
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
