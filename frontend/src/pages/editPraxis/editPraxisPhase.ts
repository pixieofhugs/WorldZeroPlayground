/**
 * Which face `/praxis/:id/edit` wears, derived from data alone (ADR-0059).
 *
 * Lifted out of `useEditPraxis.ts` verbatim (#1397) because the praxis-detail
 * page needs the same answer — its owner cluster hides the edit link on
 * `handoff`, the phase whose whole job is to redirect back to that page. Reading
 * the composer's own predicate is what stops the two drifting; importing it from
 * `useEditPraxis` would have dragged the composer's entire api/upload plumbing
 * (a 54 KB-gzip chunk) onto every praxis-detail load. This module is a leaf on
 * purpose — keep it that way.
 *
 * `useEditPraxis` re-exports all three names, so every existing importer is
 * untouched.
 */
import { deriveCollabGate } from "../../components/collab/collabGate";
import type { PraxisOut } from "../../api/praxis";
import type { DuelDetailOut } from "../../api/duel";

/**
 * Which face the composer is wearing (ADR-0059).
 *
 *  - `composing` — the faction archetype: the editor proper.
 *  - `waiting`   — the shared waiting surface: my part is submitted and the
 *    praxis is held open on somebody else.
 *  - `completed` — the same surface in its completed reading: everybody is in,
 *    so there is nothing left to wait for and nothing left to author (#1164).
 *  - `handoff`   — nothing for `/edit` to draw at all; the read page owns it
 *    from here, so the route redirects (#1164).
 *
 * The last two are what a published praxis used to get instead: a **locked
 * composer**, i.e. a third read-only rendering of a praxis beside the detail
 * page and this surface. Owner ruling on #1164: a multi-party praxis shows the
 * completed reading with a way through to `/praxis/:id`, and a solo one — which
 * has no roster and never had anyone to wait for — simply hands off.
 *
 * `controlsLocked` therefore stops meaning "render the composer, disabled" and
 * starts meaning "hand off". It still guards the one composer that legitimately
 * renders locked: a **moderated** (hidden/failed) praxis, which is the
 * archetype's own state to tell and never reaches this dispatch.
 */
export type EditPraxisPhase = "composing" | "waiting" | "completed" | "handoff";

/**
 * The two phases that draw `PraxisWaitingSurface` instead of the composer's own
 * regions — while the praxis waits on somebody else, and (#1164) once everybody
 * is in.
 *
 * Every archetype asks this, because since #1189 the stage swap is the
 * archetype's: it is the one that holds the faction's dress, and the dispatcher
 * could only hand the shared surface an undressed one. One predicate so eight
 * skins cannot disagree about when the composer stops being a composer.
 */
export function isWaitingStage(phase: EditPraxisPhase): boolean {
  return phase === "waiting" || phase === "completed";
}

/**
 * The phase, derived from data alone — no transient flag (ADR-0059).
 *
 * Deriving rather than latching means re-entry behaves the same as the cast
 * itself: re-opening `/edit` on a part you already filed shows the waiting
 * surface, which is the only place that offers a way back into your own text.
 * Latching a boolean at publish time would have left that re-entry on the
 * locked composer — the dead end #1077 patched with a single footer button.
 *
 * The `composing` fall-throughs are deliberate, not defaults:
 *  - **The holdout case.** Others submitted and I have not: `deriveCollabGate`
 *    calls that `holdout`, and it keeps the normal composer, because what it
 *    needs is an editor, not a status page (#1080). What it gains in #1164 is
 *    the ADR-0012 countdown, drawn beside the roster in the composer — it is the
 *    only player the deadline actually threatens.
 *  - **A forfeited duel.** The outcome is the read page's to tell (ADR-0059),
 *    and the completed reading's "both sides are in" would be a lie: a forfeit
 *    is an unsubmit, so the forfeiter's own side is back out (`unsubmit_praxis`
 *    returns it to `in_progress`). Left exactly as ADR-0059 set it.
 *  - **A moderated praxis.** Hidden/failed is the archetype's own locked state,
 *    and a cheerful "your part is submitted" over it would be a lie.
 *
 * `duel == null` (the detail fetch is still in flight) also reads as
 * `composing`: the surface names the rival, so it renders nothing at all rather
 * than a panel with a hole where the opponent goes.
 *
 * **Once everybody is in** (#1164) the answer is `completed`, not `composing`:
 *  - A collab is tested on `status === 'submitted'` rather than on the gate,
 *    because a window that lapses auto-publishes the collab with a holdout still
 *    outstanding (ADR-0012) — `submitted` is the fact, the gate is not.
 *  - A `settled`/`resolved` duel joins it. ADR-0059 sent those to the read page
 *    on the grounds that stage 3 is its business; the ruling on #1164 keeps that
 *    true of the *outcome* and still refuses `/edit` a locked composer.
 *  - A `declined` challenge never became a duel. What is left is an ordinary
 *    published solo praxis, so it hands off like one.
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
  // A duel side is `type='solo'` + a duel_id (ADR-0011), so it must be tested
  // before the collab branch and never by `type`.
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
