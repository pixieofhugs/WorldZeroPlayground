import type { PraxisOut } from "../../api/praxis";

/** Non-members bounce to the read page; members hydrate the draft (ADR-0013). */
export type LoadedPraxisPlan =
  | { kind: "redirect" }
  | { kind: "edit"; title: string; body: string };

export function planLoadedPraxis(
  loaded: PraxisOut,
  viewerId: number | null | undefined,
): LoadedPraxisPlan {
  const isMember =
    viewerId != null &&
    loaded.members.some((member) => member.character_id === viewerId);
  return isMember
    ? { kind: "edit", title: loaded.title ?? "", body: loaded.body_text ?? "" }
    : { kind: "redirect" };
}
