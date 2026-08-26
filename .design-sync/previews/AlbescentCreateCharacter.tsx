// AlbescentCreateCharacter (#2531) — A RE-CUTTING WRAPPER, the one of #2531's
// four that changes pixels. It renders DefaultCreateCharacter — the na kit, slot
// for slot, word for word — inside one classed div, and something that did not
// move before now moves.
//
// WHAT IS RE-CUT. na draws exactly one spectrum mark on this page: the rainbow
// ring around the phone branch's photo well, a padded conic disc with the
// portrait in it. That is the same object DefaultPointsRing is, and it wears the
// same class (`.spectrum-dial`, #2497). `.alb-moves` is the dresser that class
// was minted for, so the ring TURNS here and stands still on every other slug.
// No markup is added — the mark is na's already; this only sets it moving.
//
// THE DESKTOP BRANCH IS UNCHANGED, deliberately rather than by omission: its two
// columns carry no na spectrum at all, and the preview's mark is FactionSigil,
// which for this slug is already the labyrinth and is "never part of the
// wrapper" (ADR-0083 §1). One cell covers both widths because the archetype
// reads useFormFactor() itself.
//
// NO NEW CSS AT ALL, and no keyframe minted. Stranded — reduced motion, or the
// deferred motion sheet not yet delivered — the ring is the still rainbow an
// unaffiliated player sees, so nothing carries meaning through motion alone.
// A static capture shows that rest frame.
import { AlbescentCreateCharacter } from 'worldzero-frontend'
import { createCharacterState } from './_state'

export function Create() {
  return <AlbescentCreateCharacter state={createCharacterState('albescent')} />
}
