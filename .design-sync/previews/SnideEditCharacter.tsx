// SnideEditCharacter mobile — edit an owned life in Snide dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { SnideEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <SnideEditCharacter state={editCharacterState('snide')} />
}
