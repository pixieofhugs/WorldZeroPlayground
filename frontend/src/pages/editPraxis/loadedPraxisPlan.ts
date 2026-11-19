import type { PraxisOut } from "../../api/praxis";
import { isViewerMember } from "../../utils/praxisMembership";

/** Non-members bounce to the read page; members hydrate the draft (ADR-0013). */
export type LoadedPraxisPlan =
  | { kind: "redirect" }
  | { kind: "edit"; title: string; body: string };

export function planLoadedPraxis(
  loaded: PraxisOut,
  viewerId: number | null | undefined,
): LoadedPraxisPlan {
  return isViewerMember(loaded, viewerId)
    ? { kind: "edit", title: loaded.title ?? "", body: loaded.body_text ?? "" }
    : { kind: "redirect" };
}
