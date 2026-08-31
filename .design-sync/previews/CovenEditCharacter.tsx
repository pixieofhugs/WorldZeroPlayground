// CovenEditCharacter mobile — edit an owned life in Coven dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { CovenEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <CovenEditCharacter state={editCharacterState('coven')} />
}
