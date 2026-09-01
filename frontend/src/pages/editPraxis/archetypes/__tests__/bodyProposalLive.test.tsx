/**
 * The composer's half of a live proposal (#1811, ADR-0079) — successor to
 * `bodyFrozen.test.tsx`, which proved #1745's freeze.
 *
 * What this harness can and cannot see is the whole shape of this file.
 * CodeMirror builds its own DOM on mount and `renderToStaticMarkup` runs no
 * effects, so neither the `editable` compartment nor the transaction filter is
 * observable here. The filter's *rule* is provable, and is proved in
 * `__tests__/proposalGuard.test.ts`; the server owns the cancellation itself
 * (`collab_consensus.on_room_edit`).
 *
 * So this asserts the part that is this file's own responsibility: the member
 * whose next keystroke will end everyone's countdown is **told** so before they
 * press it, and a member with no proposal in front of them is not warned about
 * one.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { BodyTextarea } from "../controls";

/** A crew of two — the smallest praxis a proposal can exist on. */
function praxis(proposalLive: boolean) {
  const member = (id: number) => ({
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    has_submitted: false,
    is_done: false,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
  });
  return {
    id: 1,
    type: "collab",
    status: proposalLive ? "pending" : "in_progress",
    submit_proposed_at: proposalLive ? "2026-08-17T10:00:00Z" : null,
    members: [member(1), member(2)],
  };
}

function state(
  proposalLive: boolean,
  controlsLocked = false,
): EditPraxisState {
  return {
    body: "## What I did\n\nCaught the papers.",
    setBody: () => {},
    praxis: praxis(proposalLive),
    proposalConfirmArmed: proposalLive,
    confirmProposalEdit: () => {},
    controlsLocked,
    submitting: false,
  } as unknown as EditPraxisState;
}

function html(proposalConfirmArmed: boolean, controlsLocked = false): string {
  // The copy has an apostrophe, which the static renderer emits as `&#x27;` —
  // the same decode the confirm-copy and praxis-detail suites carry.
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
    // Gated on the praxis rather than on `proposalConfirmArmed`: the confirm
    // fires once and gets out of the way, but the window is still open and is
    // still what the member is deciding against on their next keystroke.
    const agreedAlready = {
      ...(state(true) as unknown as Record<string, unknown>),
      proposalConfirmArmed: false,
    } as unknown as EditPraxisState;
    expect(
      renderToStaticMarkup(
        <BodyTextarea {...agreedAlready} skin={{ textareaStyle: {} }} />,
      ).replace(/&#x27;|&#39;/g, "'"),
    ).toContain(liveLine);
  });

  it("names the consequence rather than merely flagging a state", () => {
    // The whole of the protection is one sentence and one dialog, so the
    // sentence has to say what is lost: the window and everyone's approval.
    expect(liveLine).toMatch(/window/i);
    expect(liveLine).toMatch(/approval/i);
  });

  it("still keeps the toolbar, because nothing here is a refusal", () => {
    // The freeze hid it: `dispatch` writes past `EditorView.editable`, so a
    // press would have put markdown into a document the server was dropping.
    // There is no such disagreement now — the room takes the edit, and the
    // toolbar states a `userEvent` so the guard sees it like any keystroke.
    expect(html(true)).toContain('role="toolbar"');
  });

  it("hides the toolbar on the one composer still drawn read-only", () => {
    // A moderated (hidden/failed) praxis — the only `controlsLocked` composer
    // left since #1164 sent published praxes to the read page.
    expect(html(false, true)).not.toContain('role="toolbar"');
  });
});
