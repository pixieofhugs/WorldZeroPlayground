import type { PraxisOut } from "../api/praxis";

/**
 * Mirrors the backend `_require_member`: any MEMBER may act (ADR-0013), not just
 * the creator (#348). The creator is always seeded as a member.
 */
export function isViewerMember(
  praxis: PraxisOut | null,
  viewerCharacterId: number | null | undefined,
): boolean {
  if (!praxis || viewerCharacterId == null) return false;
  return praxis.members.some(
    (member) => member.character_id === viewerCharacterId,
  );
}
