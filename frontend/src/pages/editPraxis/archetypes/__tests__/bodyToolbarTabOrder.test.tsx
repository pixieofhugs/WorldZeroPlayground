/**
 * Markdown toolbar tab order (#693): toolbar buttons render before the body, so
 * each carries tabindex="-1" and Tab runs title → body, while staying real
 * buttons in a labelled toolbar.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";
import { BodyTextarea } from "../controls";

// The toolbar is the same in every state.
const state = anEditPraxisState();

function html(): string {
  return renderToStaticMarkup(
    <BodyTextarea {...state} skin={{ textareaStyle: {} }} />,
  );
}

describe("body markdown toolbar", () => {
  it("keeps every toolbar button out of the tab order", () => {
    const markup = html();
    const buttons = markup.match(/<button[^>]*>/g) ?? [];

    // Else the next assertion passes vacuously.
    expect(buttons.length, "toolbar renders formatting buttons").toBeGreaterThan(0);

    const tabbable = buttons.filter((button) => !button.includes('tabindex="-1"'));
    expect(tabbable, "toolbar buttons must not be tab stops").toEqual([]);
  });

  it("still renders the buttons as clickable buttons in a labelled toolbar", () => {
    const markup = html();
    expect(markup).toContain('type="button"');
    expect(markup).toContain('role="toolbar"');
    expect(markup).toMatch(/role="toolbar"[^>]*aria-label="[^"]+"/);
  });

  /** CodeMirror mounts into the host at runtime (#1742); the tab stop itself
   *  is Playwright's to check. Here: toolbar before host. */
  it("draws the body's host after the toolbar, for the editor to mount into", () => {
    const markup = html();
    const host = markup.indexOf("data-composer-body");
    expect(host, "the body's host renders").toBeGreaterThan(-1);
    expect(
      markup.indexOf('role="toolbar"'),
      "the toolbar is drawn before the body",
    ).toBeLessThan(host);
  });
});
