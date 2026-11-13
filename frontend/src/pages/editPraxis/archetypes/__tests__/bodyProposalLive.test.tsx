/**
 * The composer's half of a live proposal (#1811, ADR-0079): the member whose
 * next edit cancels it is warned first. The filter rule is
 * `proposalGuard.test.ts`; the cancellation is server-side.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import { aMember, aPraxis, anEditPraxisState } from "../../../../test/fixtures";
import { BodyTextarea } from "../controls";

/** A crew of two — the smallest praxis a proposal can exist on. */
function praxis(proposalLive: boolean): PraxisOut {
  return aPraxis({
    type: "collab",
    // `pending` = proposal live (ADR-0079).
    status: proposalLive ? "pending" : "in_progress",
    submitted_at: null,
    submit_proposed_at: proposalLive ? "2026-08-17T10:00:00Z" : null,
    media_items: [],
    members: [
      aMember({ id: 1, character_id: 1, has_submitted: false }),
      aMember({ id: 2, character_id: 2, has_submitted: false }),
    ],
  });
}

function state(
  proposalLive: boolean,
  controlsLocked = false,
): EditPraxisState {
  return anEditPraxisState({
    body: "## What I did\n\nCaught the papers.",
    praxis: praxis(proposalLive),
    proposalConfirmArmed: proposalLive,
    controlsLocked,
  });
}

function html(proposalConfirmArmed: boolean, controlsLocked = false): string {
  // Decode the static renderer's escaped apostrophe.
  return renderToStaticMarkup(
    <BodyTextarea
      {...state(proposalConfirmArmed, controlsLocked)}
      skin={{ textareaStyle: {} }}
    />,
  ).replace(/&#x27;|&#39;/g, "'");
}

const liveLine = i18n.t("forms:editPraxis.composer.bodyProposalLive");

describe("a live proposal, at the write-up", () => {
  it("warns the member whose next edit will cancel it", () => {
    expect(liveLine, "the copy exists in the catalog").not.toBe("");
    expect(html(true)).toContain(liveLine);
  });

  it("says nothing of the sort while the crew is only drafting", () => {
    expect(html(false)).not.toContain(liveLine);
  });

  it("outlives the dialog, because the state it names does", () => {
    // Gated on the praxis, not `proposalConfirmArmed`: the window stays open.
    const agreedAlready: EditPraxisState = {
      ...state(true),
      proposalConfirmArmed: false,
    };
    expect(
      renderToStaticMarkup(
        <BodyTextarea {...agreedAlready} skin={{ textareaStyle: {} }} />,
      ).replace(/&#x27;|&#39;/g, "'"),
    ).toContain(liveLine);
  });

  it("names the consequence rather than merely flagging a state", () => {
    expect(liveLine).toMatch(/window/i);
    expect(liveLine).toMatch(/approval/i);
  });

  it("still keeps the toolbar, because nothing here is a refusal", () => {
    // Toolbar edits carry a `userEvent`, so the guard sees them like keys.
    expect(html(true)).toContain('role="toolbar"');
  });

  it("hides the toolbar on the one composer still drawn read-only", () => {
    // A moderated praxis: the only `controlsLocked` composer left (#1164).
    expect(html(false, true)).not.toContain('role="toolbar"');
  });
});
