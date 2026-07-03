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

function member(characterId: number): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: `Character ${characterId}`,
    has_submitted: false,
    joined_at: "2026-01-01T00:00:00Z",
  };
}

function praxis(members: PraxisMemberOut[]): PraxisOut {
  return {
    id: 1,
    task_id: 7,
    task_title: "Mangrove",
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: "ua",
    type: "collab",
    status: "in_progress",
    title: "Reforestation",
    body_text: "Seedlings planted along the estuary.",
    moderation_status: "visible",
    admin_note: null,
    flagged_at: null,
    submitted_at: null,
    submit_proposed_at: null,
    created_by_id: 3,
    created_by_display_name: "Ada",
    created_by_faction_slug: "ua",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    members,
    invites: [],
    media_items: [],
    score: 0,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
  };
}

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
