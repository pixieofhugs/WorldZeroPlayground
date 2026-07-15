// DefaultCreateCharacter mobile — the adaptive create-a-life form.
import { DefaultCreateCharacter } from 'worldzero-frontend'
import { createCharacterState } from './_state'

export function Create() {
  return <DefaultCreateCharacter state={createCharacterState('na')} />
}
