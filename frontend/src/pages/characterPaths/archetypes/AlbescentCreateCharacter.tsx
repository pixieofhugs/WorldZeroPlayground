/**
 * Albescent at character creation (#2531) — A RE-CUTTING WRAPPER, the one of
 * #2531's four that changes pixels. Something moves that did not move before,
 * and that is the whole of the delta: it renders `DefaultCreateCharacter` — the
 * na kit, slot for slot, word for word — inside one classed div.
 *
 * WHAT IS RE-CUT. na draws exactly one spectrum mark on this page: the rainbow
 * ring around the live credential card's portrait, a padded conic disc with the
 * portrait sitting in it. That is the same object `DefaultPointsRing` is, and it
 * wears the same class (`.spectrum-dial`, #2497). `.alb-moves` is the dresser
 * that class was minted for, so the ring TURNS here and stands still on every
 * other slug. No markup is added, because there is nothing to add: the mark is
 * na's already and this only sets it moving.
 *
 * THE MOUNT MOVED IN #2992, AND SO DID THE REACH. It used to be the phone
 * branch's 104px photo well — one mount, on one form factor, so the desktop
 * two-column plate carried no na spectrum at all and this wrapper had nothing to
 * grab on the wide one. That branch retired when `DefaultCreateCharacter` went
 * onto the composer chassis: there is one responsive tree now, the credential
 * card is the first thing in the sheet at BOTH widths, and its ring is the
 * conic. So Albescent's ring turns at both widths here, which is the "the
 * Albescent layer still has moving colors" half of the ruling that issue carries.
 *
 * THE RING IS `CredentialCard`'s, NOT THIS PAGE'S, and that is the non-obvious
 * half. That card only paints the conic when it is UNSKINNED, and
 * `isKnownFaction('albescent') === false` — the slug is registered but
 * deliberately unthemed, `CSS_KEY.albescent === "default"` (#783) — so an
 * Albescent credential takes the rainbow rather than an accent hoop, and the
 * dresser reaches it. The card is shared, so the class reaches the edit preview
 * and the profile header too, wherever an `.alb-moves` wrapper is the ancestor.
 * The FieldDesk roster mounts it under `.alb-desk`, so those rings stand still.
 * The calling picker's sigils are a second conic on this screen that must NOT
 * be classed: a sigil is a MARK, "never part of the wrapper" (ADR-0083 §1).
 *
 * NO NEW CSS AT ALL. `.alb-moves .spectrum-dial` (rest: a containing block) is
 * in index.css and `.alb-moves .spectrum-dial::before` (the turn: a pre-painted
 * rim inheriting the conic, rotated by `alb-spin` at 46s) is in
 * motion.ornament.css behind that sheet's `prefers-reduced-motion` gate. No
 * keyframe is minted — this joins the mount `AlbescentAvatar`, the score stamp
 * and the two detail rings already share (#911, #1003, and the epic technique
 * ruling `spectrumRingCollapse.test.ts` enforces). Stranded — reduced motion, or
 * that sheet not yet delivered — the ring is the still rainbow an unaffiliated
 * player sees, so nothing here carries meaning through motion alone.
 *
 * ONE CLASS, NOT TWO. Every sibling wrapper carries a surface class beside the
 * marker (`.alb-desk`, `.alb-feed`) because each writes a rule of its own to
 * hang off it. This one writes none, and a class nothing declares is scaffolding
 * for later — the ground `factionTokensDeclared.test.ts` fails a minted-but-
 * undeclared name on. The specificity the issue asks for is in the dresser
 * SELECTOR, `.alb-moves .spectrum-dial`: two classes, so it wins with no
 * `!important` and no structural selector.
 *
 * THE SLUG HERE IS THE PICK IN PROGRESS, not a saved character's — the page
 * reskins live as the calling is chosen and returns to na the moment it is
 * cleared. Albescent has been pickable at creation since #2399. `ADR-0027`'s
 * edge is untouched: no colour of its own, no copy of its own, nothing repainted
 * — strip `alb-moves` and this page is byte-identical to na's.
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
