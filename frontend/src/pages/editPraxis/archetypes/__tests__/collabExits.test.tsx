/**
 * The two collab exits in the composer footer (#1074). A collab is co-owned
 * (ADR-0013): Leave belongs to every member, creator included; Delete destroys
 * everyone's parts and stays the creator's alone (backend is the authority).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import type { EditPraxisState } from "../../useEditPraxis";
import { anEditPraxisState } from "../../../../test/fixtures";
import { collabCopy } from "../../../../components/collab/collabCopy";
import { DropButton, InviteSearch } from "../controls";

const CREATOR_ID = 1;
const JOINER_ID = 2;

function member(id: number): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    character_avatar_url: "",
    has_submitted: false,
    is_done: false,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
  };
}

function praxisState({
  currentCharacterId,
  memberIds = [CREATOR_ID, JOINER_ID],
  type = "collab",
}: {
  currentCharacterId: number;
  memberIds?: number[];
  type?: string;
}):EditPraxisState & { praxis: PraxisOut } {
  const praxis = {
    id: 1,
    type,
    created_by_id: CREATOR_ID,
    members: memberIds.map(member),
    invites: [],
    duel_id: null,
    task_faction_slug: null,
    task_point_value: 20,
  } as unknown as PraxisOut;
  // The second `praxis` narrows `PraxisOut | null` to the loaded type.
  return { ...anEditPraxisState({ praxis, currentCharacterId }), praxis };
}

const LEAVE_LABEL = i18n.t("forms:editPraxis.leaveAction");
const DROP_SKIN = { label: "ARCHETYPE_DROP", style: {} };

describe("Leave — every member's exit, the creator included (#1074)", () => {
  it("offers Leave to the member who started the collab", () => {
    const html = renderToStaticMarkup(
      <InviteSearch {...praxisState({ currentCharacterId: CREATOR_ID })} skin={{}} />,
    );
    expect(html).toContain(LEAVE_LABEL);
  });

  it("still offers Leave to a member who joined", () => {
    const html = renderToStaticMarkup(
      <InviteSearch {...praxisState({ currentCharacterId: JOINER_ID })} skin={{}} />,
    );
    expect(html).toContain(LEAVE_LABEL);
  });

  it("says what leaving does — the crew keeps the praxis", () => {
    const html = renderToStaticMarkup(
      <InviteSearch {...praxisState({ currentCharacterId: CREATOR_ID })} skin={{}} />,
    );
    expect(html).toContain(collabCopy(null, "leaveDescription"));
  });

  it("offers nothing to leave to someone who is not a member", () => {
    const html = renderToStaticMarkup(
      <InviteSearch {...praxisState({ currentCharacterId: 99 })} skin={{}} />,
    );
    expect(html).not.toContain(LEAVE_LABEL);
  });

  it("offers nothing to leave on a solo praxis", () => {
    const html = renderToStaticMarkup(
      <InviteSearch
        {...praxisState({
          currentCharacterId: CREATOR_ID,
          memberIds: [CREATOR_ID],
          type: "solo",
        })}
        skin={{}}
      />,
    );
    expect(html).not.toContain(LEAVE_LABEL);
  });
});

describe("Delete — the creator's alone, and it names its cost (#1074)", () => {
  it("names the consequence when other members' parts are at stake", () => {
    const html = renderToStaticMarkup(
      <DropButton
        {...praxisState({ currentCharacterId: CREATOR_ID })}
        skin={DROP_SKIN}
      />,
    );
    // The archetype's "drop task" wording undersells destroying a crew's work.
    expect(html).toContain(collabCopy(null, "deleteAction"));
    expect(html).not.toContain(DROP_SKIN.label);
    // Apostrophes are HTML-escaped; match a punctuation-free fragment.
    expect(html).toContain("Destroys the whole collab");
  });

  it("is not drawn at all for a member who did not start the collab", () => {
    const html = renderToStaticMarkup(
      <DropButton
        {...praxisState({ currentCharacterId: JOINER_ID })}
        skin={DROP_SKIN}
      />,
    );
    expect(html).toBe("");
  });

  it("keeps the archetype's own label on a solo praxis", () => {
    const html = renderToStaticMarkup(
      <DropButton
        {...praxisState({
          currentCharacterId: CREATOR_ID,
          memberIds: [CREATOR_ID],
          type: "solo",
        })}
        skin={DROP_SKIN}
      />,
    );
    expect(html).toContain(DROP_SKIN.label);
    expect(html).not.toContain(collabCopy(null, "deleteAction"));
  });

  it("keeps the archetype's own label on a collab with nobody else in it", () => {
    const html = renderToStaticMarkup(
      <DropButton
        {...praxisState({
          currentCharacterId: CREATOR_ID,
          memberIds: [CREATOR_ID],
        })}
        skin={DROP_SKIN}
      />,
    );
    expect(html).toContain(DROP_SKIN.label);
  });

  it("reads as a different act from Leave", () => {
    expect(collabCopy(null, "deleteAction")).not.toBe(LEAVE_LABEL);
  });
});
