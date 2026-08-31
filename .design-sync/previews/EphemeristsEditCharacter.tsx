// EphemeristsEditCharacter mobile — edit an owned life in Ephemerists dress.
// Sibling of DefaultEditCharacter; the slug flavors the character fixture.
import { EphemeristsEditCharacter } from 'worldzero-frontend'
import { editCharacterState } from './_state'

export function Edit() {
  return <EphemeristsEditCharacter state={editCharacterState('ephemerists')} />
}
