/**
 * Markdown toolbar tab order (#693).
 *
 * `BodyTextarea` is the one shared control behind every faction editPraxis
 * skin, and it renders its role="toolbar" formatting buttons *before* the
 * <textarea>. Without an explicit tabIndex those buttons all sit in the
 * natural tab order, so Tab from the title field stopped on eleven glyphs
 * before ever reaching the body.
 *
 * This pins the fix: every toolbar button carries tabindex="-1", so Tab runs
 * title → body. It also pins what the fix must NOT cost us — the buttons are
 * still real <button>s (mouse-clickable) and the toolbar keeps its role and
 * accessible name.
 *
 * renderToStaticMarkup needs no DOM, matching the rest of this suite.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import { BodyTextarea } from "../controls";

// BodyTextarea only reads `body` / `setBody` off the state.
const state = {
  body: "## What I did\n\nCaught the papers.",
  setBody: () => {},
} as unknown as EditPraxisState;

function html(): string {
  return renderToStaticMarkup(
    <BodyTextarea state={state} skin={{ textareaStyle: {}, rows: 8 }} />,
  );
}

describe("body markdown toolbar", () => {
  it("keeps every toolbar button out of the tab order", () => {
    const markup = html();
    const buttons = markup.match(/<button[^>]*>/g) ?? [];

    // Guard the guard: if the toolbar ever stops rendering buttons, an
    // "every button is untabbable" assertion would vacuously pass.
    expect(buttons.length, "toolbar renders formatting buttons").toBeGreaterThan(0);

    const tabbable = buttons.filter((button) => !button.includes('tabindex="-1"'));
    expect(tabbable, "toolbar buttons must not be tab stops").toEqual([]);
  });

  it("still renders the buttons as clickable buttons in a labelled toolbar", () => {
    const markup = html();
    // tabIndex={-1} removes the tab stop, not the control itself.
    expect(markup).toContain('type="button"');
    expect(markup).toContain('role="toolbar"');
    expect(markup).toMatch(/role="toolbar"[^>]*aria-label="[^"]+"/);
  });

  it("leaves the textarea itself tabbable", () => {
    const textarea = html().match(/<textarea[^>]*>/)?.[0] ?? "";
    expect(textarea, "textarea renders").not.toEqual("");
    expect(textarea, "body must remain the next tab stop").not.toContain("tabindex");
  });
});
