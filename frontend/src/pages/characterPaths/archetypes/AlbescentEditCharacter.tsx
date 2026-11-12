/**
 * Albescent editing a character (#2537): the twin of `AlbescentCreateCharacter`
 * (see it for the why) — `DefaultEditCharacter` inside one `.alb-moves` div, so
 * `CredentialCard`'s `.spectrum-dial` ring turns. `surfaceDispatch.test.ts`
 * requires a row for every surface key (#2531).
 */
import DefaultEditCharacter from './DefaultEditCharacter'
import type { EditCharacterState } from '../useEditCharacter'

export default function AlbescentEditCharacter({ state }: { state: EditCharacterState }) {
  return (
    <div className="alb-moves">
      <DefaultEditCharacter state={state} />
    </div>
  )
}
