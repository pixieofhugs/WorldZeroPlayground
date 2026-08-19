/**
 * #2215 — the seam between task detail's Drop click and the DELETE request.
 *
 * That seam used to be `window.confirm`, the last one left in the app after
 * #1082 replaced seven in the composer and #1668 the eighth. Two consequences,
 * both of which this file exists to close:
 *
 *  1. It is OS chrome a browser may decline to draw. A suppressed prompt
 *     returns `false` with no dialog, so the handler took its silent `return`
 *     and the control read as inert text — which is what was reported.
 *  2. Nothing could assert it. `renderToStaticMarkup` never saw the string, so
 *     the one sentence task detail said about dropping was checked by nobody —
 *     and it was WRONG for two of the three rows that can reach it.
 *
 * So this asserts the shape the fix depends on: which confirm each row gets,
 * and that the words reach a real, readable dialog. What it cannot assert is
 * the same list `composerConfirms.test.tsx` names — Escape, backdrop, the
 * focus move — which need a DOM this harness does not have.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import forms from "../../../locales/en/forms.json";
import ConfirmDialog from "../../../components/confirm/ConfirmDialog";
import { dropConfirmFor } from "../dropConfirm";
import { aPraxisCard } from "../../../test/fixtures";
import type { PraxisMemberOut } from "../../../api/praxis";

/** The row the hook holds: the viewer's own OPEN draft for this task. */
const draft = (over: Parameters<typeof aPraxisCard>[0] = {}) =>
  aPraxisCard({ status: "in_progress", submitted_at: null, ...over });

/** Only the count matters to the pick; the rest is filler the type wants. */
const aMember = (
  characterId: number,
  name: string,
): PraxisMemberOut => ({
  id: characterId,
  praxis_id: 55,
  character_id: characterId,
  character_display_name: name,
  character_avatar_url: "",
  has_submitted: false,
  is_done: false,
  joined_at: "2026-01-01T00:00:00Z",
  submitted_at: null,
  nudged_at: null,
});

describe("task-detail drop confirm", () => {
  it("asks the plain drop for a solo draft", () => {
    expect(dropConfirmFor(draft()).kind).toBe("dropTask");
  });

  it("asks the DUEL confirm for a duel side", () => {
    // Stored `type: 'solo'` with a duel_id (ADR-0011), so the collab test above
    // cannot catch it and the plain drop would promise something the database
    // refuses — both duel FKs on `praxis` are NO ACTION.
    expect(dropConfirmFor(draft({ duel_id: 9 })).kind).toBe("dropDuelSide");
  });

  it("warns about the crew before deleting a collab that has one", () => {
    const crewed = draft({
      type: "collab",
      members: [aMember(1, "Ada"), aMember(2, "Bo")],
      member_count: 2,
    });
    expect(dropConfirmFor(crewed).kind).toBe("deleteCollab");
  });

  it("treats a collab of one as a plain drop — there is no crew to warn about", () => {
    expect(dropConfirmFor(draft({ type: "collab", members: [] })).kind).toBe(
      "dropTask",
    );
  });

  /**
   * The half `window.confirm` made impossible: the question is now MARKUP, so
   * a test can read it. A dialog that renders no consequence, or renders it
   * without the role and name wiring that lets a screen reader announce it,
   * fails here rather than in production.
   */
  it("renders the drop question as a readable dialog", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        request={dropConfirmFor(draft())}
        factionSlug="singularity"
        onConfirm={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    // Entities back to characters — the copy has apostrophes in it.
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
    expect(text).toContain(forms.editPraxis.confirm.dropTaskTitle);
    expect(text, "the consequence, not just the question").toContain(
      forms.editPraxis.confirm.dropTask,
    );
    expect(text, "never a bare OK").toContain(
      forms.editPraxis.confirm.dropTaskAction,
    );
  });
});
