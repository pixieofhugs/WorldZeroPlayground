// WowCreateCharacter — the create-a-life form in the Wow plate (#2473).
// Character creation became a faction-dispatched surface: one responsive skin
// per faction, each taking the same CreateCharacterState the Default does.
import { WowCreateCharacter } from 'worldzero-frontend'
import { createCharacterState } from './_state'

export function Create() {
  return <WowCreateCharacter state={createCharacterState('wow')} />
}
