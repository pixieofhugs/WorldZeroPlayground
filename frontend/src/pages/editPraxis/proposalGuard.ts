/**
 * The one rule that stands between a keystroke and everyone's countdown
 * (ADR-0079, #1811).
 *
 * A collab publishes by silence-is-consent: somebody **proposes**, a window
 * opens, and an edit anywhere in the room cancels it — approvals cleared,
 * countdown stopped, back to drafting. That cancellation is server-side and
 * already live (`collab_consensus.on_room_edit`); what the client owes is that
 * it be **deliberate**. ADR-0073 rejected resetting on any CRDT update for
 * exactly this reason and chose a freeze instead; the freeze is gone, so the
 * confirmation is now the whole of the protection.
 *
 * Three things it has to be, and all three are in one predicate:
 *
 *  - **Once per proposal, not per keystroke.** The latch is the proposal's own
 *    `submit_proposed_at`, not a boolean: agreeing disarms *that* proposal and
 *    a later one arms again, with no reset to remember to fire.
 *  - **Never a block.** Declining drops the transaction and nothing else — the
 *    editor stays editable and focused, so the very next keystroke asks again.
 *  - **Only a collab crew of two or more.** Solo and duel have one member, so
 *    `all(approved)` holds on the first submit and no window ever opens
 *    (ADR-0011: a duel is two solo praxes, i.e. the solo case twice).
 *
 * A leaf module with no component imports, because the harness is
 * `renderToStaticMarkup` — no DOM, and effects never run, so the CodeMirror
 * binding in `archetypes/controls.tsx` is not observable. A rule that cannot be
 * called cannot be proved; this is the callable half, the same split
 * `roomSeal.ts` made for the same reason.
 */
import type { PraxisOut } from "../../api/praxis";

/** Only the fields the rule reads — so a test needs no whole `PraxisOut`. */
export type ProposalPraxis = Pick<
  PraxisOut,
  "type" | "members" | "submit_proposed_at"
>;

/**
 * A publish window is open on this praxis.
 *
 * `submit_proposed_at` is the proposal (ADR-0079); `status === 'pending'` is
 * deliberately NOT the test, because the timestamp is the thing that identifies
 * *which* proposal, and the latch below needs an identity rather than a mood.
 */
export function proposalIsLive(praxis: ProposalPraxis | null | undefined): boolean {
  if (!praxis) return false;
  if (praxis.type !== "collab" || praxis.members.length < 2) return false;
  return praxis.submit_proposed_at != null;
}

/**
 * Must the editor ask before it takes this member's next edit?
 *
 * `agreedTo` is the `submit_proposed_at` they have already agreed to cancel —
 * null before they have agreed to any. Comparing the two is what makes "once
 * per proposal" true across a withdraw-and-repropose without a reset.
 */
export function editNeedsProposalConfirm(
  praxis: ProposalPraxis | null | undefined,
  agreedTo: string | null,
): boolean {
  if (!proposalIsLive(praxis)) return false;
  return praxis!.submit_proposed_at !== agreedTo;
}
