/**
 * Which confirm task detail's Drop control asks for (#2215). Pure, so it is
 * testable without a DOM. Reuses the composer's three confirms: dropping from
 * task detail and cancelling from `/praxis/:id/edit` are the same act.
 */
import {
  deleteCollabConfirm,
  dropDuelSideConfirm,
  dropTaskConfirm,
  type ConfirmRequest,
} from "../../components/confirm/composerConfirms";
import type { PraxisCardOut } from "../../api/praxis";

/**
 * Crewed collab first (its cost falls on others); a collab is never a duel side
 * (ADR-0011). A collab of one takes the plain drop.
 */
export function dropConfirmFor(praxis: PraxisCardOut): ConfirmRequest {
  const crewAtStake = praxis.type === "collab" && praxis.members.length > 1;
  if (crewAtStake) return deleteCollabConfirm(praxis.task_faction_slug);
  // A duel side is stored `type: 'solo'` with a `duel_id` (ADR-0011).
  if (praxis.duel_id != null) return dropDuelSideConfirm();
  return dropTaskConfirm();
}
