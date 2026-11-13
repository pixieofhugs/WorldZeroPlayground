/**
 * Which face `/praxis/:id/edit` wears, derived from data alone (ADR-0059).
 * A leaf module on purpose (#1397): praxis-detail imports it, and importing
 * `useEditPraxis` would pull a 54 KB-gzip chunk. `useEditPraxis` re-exports it.
 */
import { deriveCollabGate } from "../../components/collab/collabGate";
import type { PraxisOut } from "../../api/praxis";
import type { DuelDetailOut } from "../../api/duel";

/**
 * Which face the composer is wearing (ADR-0059):
 *  - `composing` — the faction archetype's editor.
 *  - `waiting`   — shared waiting surface; my part is in, others' are not.
 *  - `completed` — same surface, everybody in (#1164).
 *  - `handoff`   — nothing to draw; the route redirects to the read page.
 * The only composer that renders locked is a moderated (hidden/failed) one.
 */
export type EditPraxisPhase = "composing" | "waiting" | "completed" | "handoff";

/**
 * Phases that draw `PraxisWaitingSurface`. Archetypes own the swap (#1189) so
 * it gets their dress; one predicate so they agree.
 */
export function isWaitingStage(phase: EditPraxisPhase): boolean {
  return phase === "waiting" || phase === "completed";
}

/**
 * The phase, derived (never latched) so re-entry matches the cast (ADR-0059).
 *
 * Deliberate `composing` fall-throughs: the holdout (needs an editor, #1080);
 * a forfeited duel (a forfeit is an unsubmit, so "both in" would lie); a
 * moderated praxis; and `duel == null` while the detail fetch is in flight.
 *
 * `completed` (#1164): a collab on `status === 'submitted'`, not the gate (a
 * lapsed window publishes over a holdout, ADR-0012); a settled/resolved duel.
 * A `declined` challenge is an ordinary solo praxis and hands off.
 */
export function deriveEditPraxisPhase(
  praxis: PraxisOut | null,
  duel: DuelDetailOut | null,
  currentCharacterId: number | null | undefined,
): EditPraxisPhase {
  if (!praxis) return "composing";
  if (
    praxis.moderation_status === "hidden" ||
    praxis.moderation_status === "failed"
  ) {
    return "composing";
  }
  // A duel side is `type='solo'` + duel_id (ADR-0011): test before collab.
  if (praxis.duel_id != null) {
    if (praxis.status !== "submitted") return "composing";
    if (duel == null) return "composing";
    if (duel.forfeited_by_character_id != null) return "composing";
    if (duel.status === "active" || duel.status === "pending") return "waiting";
    if (duel.status === "declined") return "handoff";
    return "completed";
  }
  if (praxis.type === "collab" && praxis.members.length > 1) {
    if (praxis.status === "submitted") return "completed";
    return deriveCollabGate(praxis.members, currentCharacterId).state ===
      "waiting"
      ? "waiting"
      : "composing";
  }
  // Solo — including a one-member collab, which has nobody to wait for either.
  return praxis.status === "submitted" ? "handoff" : "composing";
}
