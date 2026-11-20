/**
 * May the body editor take text? Kept out of `archetypes/controls.tsx` so it is
 * callable in the effect-less `renderToStaticMarkup` harness.
 */

import type { PraxisOut } from "../../api/praxis";
import { isViewerMember } from "../../utils/praxisMembership";

/**
 * `seeded` false = not yet: typing before the server's once-only seed merges
 * into unseen text (ADR-0073). `locked` = moderated (hidden/failed);
 * `EditPraxisState.controlsLocked`. `ended` = the server closed the room for
 * good (kick, seal); a redial is refused, so the text could never send.
 */
export function composerWritable(
  seeded: boolean,
  locked: boolean,
  ended = false,
): boolean {
  return seeded && !locked && !ended;
}

/** Kick and seal both close with a bare 1008; the refetched praxis tells them apart. */
export type RoomEndReason = "live" | "removed";

export function roomEndReason(
  refetched: PraxisOut | null,
  viewerId: number | null | undefined,
): RoomEndReason {
  return refetched?.status === "submitted" && isViewerMember(refetched, viewerId)
    ? "live"
    : "removed";
}
