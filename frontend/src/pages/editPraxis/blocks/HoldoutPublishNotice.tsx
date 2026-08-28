/**
 * The ADR-0012 publish window, shown to the one player it threatens (#1164).
 *
 * A member's submission opens a pending-publish window of
 * `era.collab_auto_submit_days`, stamped on the praxis as `submit_proposed_at`.
 * When it lapses with no edit, the next read publishes the collab — with or
 * without the parts still outstanding. The member who has **not** submitted is
 * therefore the only one with anything to lose to it, and they are the one
 * player who never saw it: #1080 routes them to the ordinary composer (rightly
 * — what a holdout needs is an editor, not a status page), and the composer drew
 * no clock. The waiting surface's ring is for the members who are already in.
 *
 * So this is the ring's plain-text twin, mounted beside the roster in
 * `InviteSearch` — one mount, all sixteen composer skins, both form factors.
 *
 * Three rules it exists to keep:
 *
 *  - **Only the holdout.** `deriveCollabGate` owns that state, so it is asked
 *    rather than re-derived here. Anyone else's composer draws nothing.
 *  - **Only once the window is open.** It opens when a member **proposes**
 *    (ADR-0079), so a collab with no live proposal has no `submit_proposed_at`
 *    and no line — `collabPublishWindow` returns null and this renders nothing.
 *  - **Never a hardcoded 10.** The duration is an `EraConfig` field arriving on
 *    `/game-config`; unknown means undrawn, never assumed.
 *
 * The arithmetic is `waitingClock.ts`, unchanged and shared with the ring — the
 * countdown is computed from the props at render, so it recomputes whenever the
 * praxis payload does.
 *
 * The caption moved twice, and is back where it started. #1745 froze the
 * write-up while the window ran, so the holdout's only move was to reopen it;
 * ADR-0079 retires that freeze, and typing is once again what cancels the
 * countdown. So the caption offers the two real moves — approve it, or keep
 * writing — rather than a door out of a lock that no longer exists. What makes
 * silence-is-consent fair is precisely that this player can always answer it by
 * typing; the confirm on the first keystroke (`proposalGuard.ts`) is what keeps
 * that from happening by accident.
 */
import type { PraxisMemberOut } from "../../../api/praxis";
import { deriveCollabGate } from "../../../components/collab/CollabRoster";
import { collabCopy } from "../../../components/collab/collabCopy";
import { factionCssVar } from "../../../utils/factions";
import { collabPublishWindow } from "../waiting/waitingClock";

interface HoldoutPublishNoticeProps {
  members: readonly PraxisMemberOut[];
  currentCharacterId: number | null | undefined;
  factionSlug: string | null | undefined;
  /** `PraxisOut.submit_proposed_at` — null until somebody submits. */
  submitProposedAt: string | null | undefined;
  /** `collab_auto_submit_days`; null until `/game-config` lands. */
  autoSubmitDays: number | null | undefined;
  /** Injectable clock — the harness runs no effects, so this has to be a prop. */
  now?: number;
}

export default function HoldoutPublishNotice({
  members,
  currentCharacterId,
  factionSlug,
  submitProposedAt,
  autoSubmitDays,
  now,
}: HoldoutPublishNoticeProps) {
  if (deriveCollabGate(members, currentCharacterId).state !== "holdout") {
    return null;
  }
  const publishWindow = collabPublishWindow(submitProposedAt, autoSubmitDays, now);
  if (!publishWindow) return null;

  // The roster's own holdout ink: this line sits directly under its banner and
  // is the same warning carried one step further, so it reads in the same
  // colour on all eight faction sheets.
  const notice = factionCssVar(factionSlug, "card-notice");
  const line = publishWindow.lapsed
    ? collabCopy(factionSlug, "holdoutClockLineLapsed")
    : publishWindow.daysLeft > 0
      ? collabCopy(factionSlug, "holdoutClockLine", {
          days: publishWindow.daysLeft,
          hours: publishWindow.hoursLeft,
        })
      : collabCopy(factionSlug, "holdoutClockLineHours", {
          hours: publishWindow.hoursLeft,
        });

  return (
    <div
      className="flex flex-col gap-1 mt-2 px-3 py-2"
      style={{
        flex: "1 1 100%",
        borderRadius: 4,
        border: `1px solid ${notice}`,
        color: notice,
      }}
    >
      <span className="font-body label-caption">{line}</span>
      {/* The way out, said in the same breath as the deadline: submitting ends
          it, and an edit cancels it outright (ADR-0012). A countdown with no
          stated escape reads as a threat rather than a rule. */}
      <span className="font-body label-caption">
        {collabCopy(factionSlug, "holdoutClockCaption")}
      </span>
    </div>
  );
}
