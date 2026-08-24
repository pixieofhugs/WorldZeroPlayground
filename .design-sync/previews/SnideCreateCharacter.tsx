// SnideCreateCharacter — the create-a-life form in the Snide plate (#2473).
// Character creation became a faction-dispatched surface: one responsive skin
// per faction, each taking the same CreateCharacterState the Default does.
import { SnideCreateCharacter } from 'worldzero-frontend'
import { createCharacterState } from './_state'

export function Create() {
  return <SnideCreateCharacter state={createCharacterState('snide')} />
}
