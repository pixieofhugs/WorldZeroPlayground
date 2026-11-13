/**
 * Albescent at character creation (#2531): `DefaultCreateCharacter` inside one
 * `.alb-moves` div, so the na credential card's `.spectrum-dial` ring (#2497)
 * turns, at both widths. The ring is `CredentialCard`'s: Albescent is unthemed
 * (`CSS_KEY.albescent === "default"`, #783), so the card paints the conic. The
 * picker's sigils must NOT be classed (ADR-0083 §1).
 *
 * No new CSS: `.alb-moves .spectrum-dial` lives in index.css and its `::before`
 * spin in motion.ornament.css behind `prefers-reduced-motion`; stranded, the ring
 * is na's still rainbow. One class only — no rule needs a surface class
 * (`factionTokensDeclared.test.ts`). The slug is the pick in progress; strip
 * `alb-moves` and the page is na's byte for byte (ADR-0027).
 */
import DefaultCreateCharacter from './DefaultCreateCharacter'
import type { CreateCharacterState } from '../useCreateCharacter'

export default function AlbescentCreateCharacter({ state }: { state: CreateCharacterState }) {
  return (
    <div className="alb-moves">
      <DefaultCreateCharacter state={state} />
    </div>
  )
}
