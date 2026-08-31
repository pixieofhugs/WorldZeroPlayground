// AlbescentEditCharacter mobile — edit an owned life, in Albescent's dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { AlbescentEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <AlbescentEditCharacter state={editCharacterState('albescent')} />
}
