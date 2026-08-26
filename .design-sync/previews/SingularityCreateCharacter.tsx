// SingularityCreateCharacter — the create-a-life form in the Singularity plate.
// Character creation became a faction-dispatched surface (#2473): one
// responsive skin per faction, each taking the same CreateCharacterState the
// Default does. The archetype reads useFormFactor() itself, so one cell covers
// both the phone and desktop branches.
import { SingularityCreateCharacter } from 'worldzero-frontend'
import { createCharacterState } from './_state'

export function Create() {
  return <SingularityCreateCharacter state={createCharacterState('singularity')} />
}
