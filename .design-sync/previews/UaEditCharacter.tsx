// UaEditCharacter mobile — edit an owned life in Ua dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { UaEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <UaEditCharacter state={editCharacterState('ua')} />
}
