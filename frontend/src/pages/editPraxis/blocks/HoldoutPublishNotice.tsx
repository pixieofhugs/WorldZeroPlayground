/**
 * The ADR-0012 publish-window countdown, for the holdout only (#1164): the one
 * member with something to lose, who sits on the ordinary composer rather than
 * the waiting surface's ring. Renders nothing unless `deriveCollabGate` says
 * holdout and a proposal is live (ADR-0079). The duration comes from
 * `EraConfig` via `/game-config`; unknown means undrawn. Math: `waitingClock.ts`.
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

  // Same ink as the roster's holdout banner above it.
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
      {/* The way out: approve, or edit to cancel (ADR-0012). */}
      <span className="font-body label-caption">
        {collabCopy(factionSlug, "holdoutClockCaption")}
      </span>
    </div>
  );
}
