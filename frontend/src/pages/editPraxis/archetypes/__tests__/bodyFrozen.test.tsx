/**
 * The composer's half of the freeze (#1745).
 *
 * What this harness can and cannot see is the whole shape of this file.
 * CodeMirror builds its own DOM on mount and `renderToStaticMarkup` runs no
 * effects, so `EditorView.editable` — the compartment the freeze actually
 * reconfigures — is not observable here. The server is what makes the freeze a
 * rule anyway; it drops the room updates a frozen praxis would otherwise take,
 * and `backend/tests/integration/test_praxis_room.py` is where that is proved.
 *
 * So these assert the part that is this file's own responsibility and that the
 * server cannot do for it: that a member who cannot type is **told** so, and is
 * given the one door back. A silently inert editor and a frozen one look
 * identical, and only one of them is a rule.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { BodyTextarea } from "../controls";

function state(documentFrozen: boolean): EditPraxisState {
  return {
    body: "## What I did\n\nCaught the papers.",
    setBody: () => {},
    documentFrozen,
    submitting: false,
    reopenForEdit: async () => {},
  } as unknown as EditPraxisState;
}

function html(documentFrozen: boolean): string {
  // The copy has an apostrophe, which the static renderer emits as `&#x27;` —
  // the same decode the confirm-copy and praxis-detail suites carry.
  return renderToStaticMarkup(
    <BodyTextarea state={state(documentFrozen)} skin={{ textareaStyle: {} }} />,
  ).replace(/&#x27;|&#39;/g, "'");
}

const frozenLine = i18n.t("forms:editPraxis.composer.bodyFrozen");
const reopenLine = i18n.t("forms:editPraxis.composer.bodyFrozenAction");

describe("a frozen write-up", () => {
  it("says the write-up is frozen rather than leaving it inert", () => {
    expect(frozenLine, "the copy exists in the catalog").not.toBe("");
    expect(html(true)).toContain(frozenLine);
  });

  it("says nothing of the sort while the room is open", () => {
    const markup = html(false);
    expect(markup).not.toContain(frozenLine);
    expect(markup).not.toContain(reopenLine);
  });

  it("offers the re-entry, which is the only door back in", () => {
    const markup = html(true);
    expect(markup).toContain(reopenLine);
    // `reopenForEdit`, not a raw write: ADR-0059, and since #1745 the only way
    // a sealed document reopens at all.
    expect(markup).toMatch(/<button[^>]*>[^<]*Reopen/);
  });

  it("hides the markdown toolbar, which writes past the read-only flag", () => {
    // `dispatch` does not consult `EditorView.editable`, so a toolbar press on a
    // frozen document would put markdown into it — locally, where the server
    // then refuses it and the two silently disagree. Hidden, never disabled.
    expect(html(true)).not.toContain('role="toolbar"');
    expect(html(false), "the toolbar is there to lose").toContain(
      'role="toolbar"',
    );
  });
});
