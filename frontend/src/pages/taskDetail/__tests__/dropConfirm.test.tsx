/**
 * #2215: task detail's Drop confirm is a real dialog, not `window.confirm` (which
 * a browser may suppress, making the control look inert). Pins which confirm
 * each row gets and that the words render. Escape/backdrop/focus need a DOM.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import forms from "../../../locales/en/forms.json";
import ConfirmDialog from "../../../components/confirm/ConfirmDialog";
import { dropConfirmFor } from "../dropConfirm";
import { aPraxisCard } from "../../../test/fixtures";
import type { PraxisMemberOut } from "../../../api/praxis";

/** The viewer's own open draft for this task. */
const draft = (over: Parameters<typeof aPraxisCard>[0] = {}) =>
  aPraxisCard({ status: "in_progress", submitted_at: null, ...over });

/** Only the count matters to the pick. */
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
    // Stored `type: 'solo'` with a duel_id (ADR-0011); duel FKs are NO ACTION.
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

  /** The consequence must render, with dialog role wiring for screen readers. */
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
    // Decode entities: the copy has apostrophes.
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
