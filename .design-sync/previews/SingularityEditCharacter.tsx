// SingularityEditCharacter mobile — edit an owned life in Singularity dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { SingularityEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <SingularityEditCharacter state={editCharacterState('singularity')} />
}
