// EverymenEditCharacter mobile — edit an owned life in Everymen dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { EverymenEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <EverymenEditCharacter state={editCharacterState('everymen')} />
}
