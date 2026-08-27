/**
 * #348 — owner actions are membership-gated, not creator-gated.
 *
 * The backend authorizes any praxis MEMBER to edit/submit/withdraw
 * (ADR-0013 co-ownership, _require_member). isViewerMember mirrors that
 * guard so an invited collaborator sees the owner actions, while the
 * creator (always seeded as a member) keeps them on solo/duel praxes.
 */
import { describe, it, expect } from "vitest";
import { isViewerMember } from "../usePraxisDetail";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";
import { aMember, aPraxis } from "../../../test/fixtures";

const member = (characterId: number): PraxisMemberOut =>
  aMember({
    id: characterId * 10,
    character_id: characterId,
    character_display_name: `Character ${characterId}`,
    has_submitted: false,
  });

/** An unfinished collab — the only shape with a roster the guard reads. */
const praxis = (members: PraxisMemberOut[]): PraxisOut =>
  aPraxis({ type: "collab", status: "in_progress", submitted_at: null, members });


describe("isViewerMember (#348)", () => {
  it("is true for the creator (always seeded as a member)", () => {
    expect(isViewerMember(praxis([member(3)]), 3)).toBe(true);
  });

  it("is true for an invited collaborator who is NOT the creator", () => {
    expect(isViewerMember(praxis([member(3), member(5)]), 5)).toBe(true);
  });

  it("is false for a non-member viewer", () => {
    expect(isViewerMember(praxis([member(3), member(5)]), 9)).toBe(false);
  });

  it("is false when anonymous or praxis not loaded", () => {
    expect(isViewerMember(praxis([member(3)]), null)).toBe(false);
    expect(isViewerMember(praxis([member(3)]), undefined)).toBe(false);
    expect(isViewerMember(null, 3)).toBe(false);
  });
});
