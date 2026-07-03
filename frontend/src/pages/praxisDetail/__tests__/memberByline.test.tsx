/**
 * #387 — a published collab praxis credits every co-author, not just the
 * creator. `orderedMembers` puts the creator first, then the rest by join
 * order; `MemberByline` renders the ordered names Oxford-style
 * (Ada / Ada & Beth / Ada, Beth & Cy), each name linked to its character.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { orderedMembers, MemberByline } from "../shared";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";

function member(
  characterId: number,
  name: string,
  joinedAt: string,
): PraxisMemberOut {
  return {
    id: characterId * 10,
    praxis_id: 1,
    character_id: characterId,
    character_display_name: name,
    has_submitted: false,
    joined_at: joinedAt,
  };
}

function praxis(members: PraxisMemberOut[], createdById: number): PraxisOut {
  return {
    id: 1,
    task_id: 7,
    task_title: "Mangrove",
    task_point_value: 30,
    task_level_required: 3,
    task_faction_slug: "ua",
    type: "collab",
    status: "submitted",
    title: "Reforestation",
    body_text: "Seedlings planted along the estuary.",
    moderation_status: "visible",
    admin_note: null,
    flagged_at: null,
    submitted_at: null,
    submit_proposed_at: null,
    created_by_id: createdById,
    created_by_display_name: "Ada",
    created_by_faction_slug: "ua",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    members,
    invites: [],
    media_items: [],
    score: 0,
    is_top_for_task: false,
    duel_id: null,
    can_flag: true,
    applied_metatasks: [],
  };
}

// Creator (id 1 = "Ada") joined last on purpose, to prove creator-first
// overrides join order for the creator specifically.
const ADA = member(1, "Ada", "2026-01-03T00:00:00Z");
const BETH = member(2, "Beth", "2026-01-01T00:00:00Z");
const CY = member(3, "Cy", "2026-01-02T00:00:00Z");

function bylineText(members: PraxisMemberOut[]): string {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <MemberByline praxis={praxis(members, 1)} />
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
