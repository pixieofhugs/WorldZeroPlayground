// WowEditCharacter mobile — edit an owned life in Wow dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { WowEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <WowEditCharacter state={editCharacterState('wow')} />
}
