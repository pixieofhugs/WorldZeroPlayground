// AlbescentEditCharacter mobile — Edit Character wears the faction it edits (#2788).
import { AlbescentEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <AlbescentEditCharacter state={editCharacterState('albescent')} />
}
