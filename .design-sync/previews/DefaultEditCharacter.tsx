// DefaultEditCharacter mobile — edit an owned life.
import { DefaultEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <DefaultEditCharacter state={editCharacterState('ua')} />
}
