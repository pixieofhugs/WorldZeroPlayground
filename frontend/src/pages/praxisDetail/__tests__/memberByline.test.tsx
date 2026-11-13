/** #387: a published collab credits every co-author, creator first. */
import { describe, it, expect } from "vitest";

import "../../../i18n";
import { orderedMembers, MemberByline } from "../shared";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";
import { aMember, aPraxis } from "../../../test/fixtures";
import { markup } from "../../../test/praxisDetail";

const member = (
  characterId: number,
  name: string,
  joinedAt: string,
  hasSubmitted = false,
): PraxisMemberOut =>
  aMember({
    id: characterId * 10,
    character_id: characterId,
    character_display_name: name,
    has_submitted: hasSubmitted,
    joined_at: joinedAt,
  });

const praxis = (
  members: PraxisMemberOut[],
  createdById: number,
  status: PraxisOut["status"] = "submitted",
): PraxisOut =>
  aPraxis({
    task_faction_slug: "ua",
    type: "collab",
    status,
    submitted_at: null,
    created_by_id: createdById,
    created_by_faction_slug: "ua",
    media_items: [],
    members,
  });


// The creator (Ada) joined last on purpose.
const ADA = member(1, "Ada", "2026-01-03T00:00:00Z");
const BETH = member(2, "Beth", "2026-01-01T00:00:00Z");
const CY = member(3, "Cy", "2026-01-02T00:00:00Z");

function bylineText(
  members: PraxisMemberOut[],
  status: PraxisOut["status"] = "submitted",
): string {
  const { html } = markup(<MemberByline praxis={praxis(members, 1, status)} />);
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
    const { html } = markup(<MemberByline praxis={praxis([ADA, BETH], 1)} />);

    expect(html).toContain('href="/characters/1"');
    expect(html).toContain('href="/characters/2"');
  });
});

// No cast markers (#1089): cast state belongs to the composer (ADR-0062). Fed
// the statuses that used to mark.

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
