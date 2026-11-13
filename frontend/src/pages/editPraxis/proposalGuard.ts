/**
 * The confirm-before-cancelling-a-proposal rule (ADR-0079, #1811).
 *
 * A collab publishes by silence-is-consent: any room edit cancels a live
 * proposal (server-side, `collab_consensus.on_room_edit`). The client's job is
 * making that edit deliberate:
 *
 *  - **Once per proposal**: the latch is `submit_proposed_at`, so a later
 *    proposal re-arms without a reset.
 *  - **Never a block**: declining drops the transaction; the next keystroke asks again.
 *  - **Collab crews of 2+ only**: solo/duel never open a window (ADR-0011).
 *
 * A leaf module so the rule is callable in the effect-less harness (as `roomSeal.ts`).
 */
import type { PraxisOut } from "../../api/praxis";

export type ProposalPraxis = Pick<
  PraxisOut,
  "type" | "members" | "submit_proposed_at"
>;

/**
 * A publish window is open. Tests the timestamp, not `status === 'pending'`:
 * the latch needs the proposal's identity.
 */
export function proposalIsLive(praxis: ProposalPraxis | null | undefined): boolean {
  if (!praxis) return false;
  if (praxis.type !== "collab" || praxis.members.length < 2) return false;
  return praxis.submit_proposed_at != null;
}

/**
 * Must the editor ask before this member's next edit? `agreedTo` is the
 * `submit_proposed_at` they already agreed to cancel (null if none).
 */
export function editNeedsProposalConfirm(
  praxis: ProposalPraxis | null | undefined,
  agreedTo: string | null,
): boolean {
  if (!proposalIsLive(praxis)) return false;
  return praxis!.submit_proposed_at !== agreedTo;
}
