/**
 * Which confirm task detail's Drop control asks for (#2215).
 *
 * A pure props-in/value-out builder, like `levelJump.ts` and `signupCta.ts`
 * beside it, and for the reason `composerConfirms.ts` gives: the dialog needs a
 * DOM, a request does not. This repo's harness has no DOM, so a branch left
 * inline in `useTaskDetail` would be a branch nothing could assert — which is
 * exactly the hole `window.confirm` left on this control for as long as it was
 * there.
 *
 * The three cases are the COMPOSER'S, reused rather than restated: dropping a
 * draft from task detail and cancelling it from `/praxis/:id/edit` are the same
 * act on the same row, so a second set of words for them would be a second set
 * to keep true. Task detail used to say one sentence for all three — "Drop this
 * task? You can sign up again later." — and for the duel case that sentence was
 * a promise the database refuses (both duel FKs on `praxis` are NO ACTION; see
 * the dissolve in `useTaskDetail.confirmDrop`).
 */
import {
  deleteCollabConfirm,
  dropDuelSideConfirm,
  dropTaskConfirm,
  type ConfirmRequest,
} from "../../components/confirm/composerConfirms";
import type { PraxisCardOut } from "../../api/praxis";

/**
 * The confirm for dropping `praxis`.
 *
 * Order matters. A crewed collab is asked about first because it is the only
 * case whose cost falls on somebody else, and a collab is never a duel side
 * (ADR-0011 requires a duel side to be solo), so the two branches cannot both
 * be true. A collab of ONE takes the plain drop: there is no crew to warn about.
 */
export function dropConfirmFor(praxis: PraxisCardOut): ConfirmRequest {
  const crewAtStake = praxis.type === "collab" && praxis.members.length > 1;
  if (crewAtStake) return deleteCollabConfirm(praxis.task_faction_slug);
  // Stored `type: 'solo'` with a `duel_id` (ADR-0011) — so this must be asked
  // after the collab check and cannot be folded into it.
  if (praxis.duel_id != null) return dropDuelSideConfirm();
  return dropTaskConfirm();
}
