/**
 * #387 — a published collab praxis credits every co-author, not just the
 * creator. `orderedMembers` puts the creator first, then the rest by join
 * order; `MemberByline` renders the ordered names Oxford-style
 * (Ada / Ada & Beth / Ada, Beth & Cy), each name linked to its character.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
// Initialize the catalog so the collab submit-state markers resolve to English.
import "../../../i18n";
import { orderedMembers, MemberByline } from "../shared";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";

function member(
  characterId: number,
  name: string,
  joinedAt: string,
  hasSubmitted = false,
): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: name,
    has_submitted: hasSubmitted,
    is_done: false,
    joined_at: joinedAt,
    nudged_at: null,
    submitted_at: null,
  };
}

function praxis(
  members: PraxisMemberOut[],
  createdById: number,
  status: PraxisOut["status"] = "submitted",
): PraxisOut {
  return {
    id: 1,
    task_id: 7,
    task_title: "Mangrove",
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: "ua",
    type: "collab",
    status,
    title: "Reforestation",
    body_text: "Seedlings planted along the estuary.",
    moderation_status: "visible",
    admin_note: null,
    flagged_at: null,
    submitted_at: null,
    submit_proposed_at: null,
    created_by_id: createdById,
    created_by_display_name: "Ada",
    created_by_avatar_url: "",
    created_by_faction_slug: "ua",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    members,
    invites: [],
    media_items: [],
    score: 0,
    metatask_points: 0,
    display_multiplier: 1.0,
    points_from_votes: 0,
    habit_bonus_points: 0,
    is_top_for_task: false,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
    viewer_can_vote: true,
    viewer_vote: null,
    voter_count: 0,
  };
}

// Creator (id 1 = "Ada") joined last on purpose, to prove creator-first
// overrides join order for the creator specifically.
const ADA = member(1, "Ada", "2026-01-03T00:00:00Z");
const BETH = member(2, "Beth", "2026-01-01T00:00:00Z");
const CY = member(3, "Cy", "2026-01-02T00:00:00Z");

function bylineText(
  members: PraxisMemberOut[],
  status: PraxisOut["status"] = "submitted",
): string {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <MemberByline praxis={praxis(members, 1, status)} />
    </MemoryRouter>,
  );
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
}

describe("orderedMembers (#387)", () => {
  it("puts the creator first, then the rest by joined_at ascending", () => {
    const names = orderedMembers(praxis([ADA, BETH, CY], 1)).map(
      (m) => m.character_display_name,
    );
    expect(names).toEqual(["Ada", "Beth", "Cy"]);
  });

  it("keeps a single (solo/duel) member as-is", () => {
    const names = orderedMembers(praxis([ADA], 1)).map(
      (m) => m.character_display_name,
    );
    expect(names).toEqual(["Ada"]);
  });
});

describe("MemberByline join format (#387)", () => {
  it("renders one name plainly", () => {
    expect(bylineText([ADA])).toBe("Ada");
  });

  it("joins two names with an ampersand", () => {
    expect(bylineText([ADA, BETH])).toBe("Ada & Beth");
  });

  it("joins three+ names Oxford-style (& before the last)", () => {
    expect(bylineText([ADA, BETH, CY])).toBe("Ada, Beth & Cy");
  });

  it("links each name to its character profile", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MemberByline praxis={praxis([ADA, BETH], 1)} />
      </MemoryRouter>,
    );
    expect(html).toContain('href="/characters/1"');
    expect(html).toContain('href="/characters/2"');
  });
});

// ─── The #521 submit markers are gone (#1089) ────────────────────────────────
// Each name used to carry "✓ submitted" or "drafting" from has_submitted, gated
// to an in_progress / pending collab. ADR-0062 redirects both statuses to the
// composer, so the marker could never paint on a page this byline renders on,
// and #1089 removed it. The byline now does exactly one job: credit every
// co-author (#387). Cast state belongs to the composer's roster (#1071).
//
// The statuses below are the ones that USED to mark, fed in deliberately, so a
// reintroduced marker fails here rather than shipping a second answer to "who
// still owes their part".

describe("MemberByline carries no cast markers (#521 → #1089)", () => {
  const ADA_SUBMITTED = member(1, "Ada", "2026-01-03T00:00:00Z", true);
  const BETH_DRAFTING = member(2, "Beth", "2026-01-01T00:00:00Z", false);

  it("names only, on a collab still in editing", () => {
    expect(bylineText([ADA_SUBMITTED, BETH_DRAFTING], "in_progress")).toBe(
      "Ada & Beth",
    );
  });

  it("names only, on a collab mid-consensus", () => {
    expect(bylineText([ADA_SUBMITTED, BETH_DRAFTING], "pending")).toBe(
      "Ada & Beth",
    );
  });

  it("names only, on the published collab this page actually renders", () => {
    const text = bylineText([ADA_SUBMITTED, BETH_DRAFTING], "submitted");
    expect(text).toBe("Ada & Beth");
    expect(text).not.toContain("drafting");
  });

  it("leaves a solo (single-member) praxis unmarked", () => {
    expect(bylineText([ADA_SUBMITTED], "in_progress")).toBe("Ada");
  });
});
