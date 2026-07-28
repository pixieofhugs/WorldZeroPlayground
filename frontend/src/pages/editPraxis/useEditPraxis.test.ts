/**
 * Mode-switch confirm logic. Switches are now in-place (#321 solo↔collab, #311
 * duel), so the draft is always preserved — only genuinely destructive
 * transitions warn: leaving a live duel, or collab→solo dropping co-authors.
 */
import { describe, it, expect } from "vitest";
import { hasUnsavedEdits } from "./useEditPraxis";
// The mode-switch confirm moved out of the hook with the rest of them (#1082)
// and now returns a whole ConfirmRequest instead of a `window.confirm` string.
import { modeSwitchConfirm } from "../../components/confirm/composerConfirms";

/**
 * Dirty-check gating the pre-submit PUT (#360). persistEdits only fires
 * updatePraxis when this returns true — on a collab an unconditional PUT
 * reset every member's has_submitted (ADR-0012), so consensus was never
 * reachable through the UI.
 */
describe("hasUnsavedEdits", () => {
  it("is false when title and body match the last-persisted values → no PUT on submit", () => {
    expect(hasUnsavedEdits("Title", "Body", "Title", "Body")).toBe(false);
  });

  it("is true when the title changed → PUT fires (and resets collab consensus, per ADR-0012)", () => {
    expect(hasUnsavedEdits("New title", "Body", "Title", "Body")).toBe(true);
  });

  it("is true when the body changed", () => {
    expect(hasUnsavedEdits("Title", "New body", "Title", "Body")).toBe(true);
  });

  it("is true before hydration (refs still null), preserving the old always-save behavior", () => {
    expect(hasUnsavedEdits("Title", "", null, null)).toBe(true);
  });
});

describe("modeSwitchConfirm", () => {
  it("warns that co-authors will be dropped on collab → solo with a crew (#155)", () => {
    const request = modeSwitchConfirm("solo", "collab", 2, false);
    expect(request?.body).toMatch(/co-authors/i);
    expect(request?.kind).toBe("soloDropsCoauthors");
  });

  it("warns that the duel is cancelled when leaving a live duel", () => {
    expect(modeSwitchConfirm("collab", "solo", 1, true)?.body).toMatch(/duel/i);
    expect(modeSwitchConfirm("solo", "solo", 1, true)?.body).toMatch(/duel/i);
  });

  it("does not warn when re-selecting duel while dueling", () => {
    expect(modeSwitchConfirm("duel", "solo", 1, true)).toBeNull();
  });

  it("proceeds silently for a lossless switch (solo → collab, or solo crew)", () => {
    expect(modeSwitchConfirm("collab", "solo", 1, false)).toBeNull();
    expect(modeSwitchConfirm("solo", "collab", 1, false)).toBeNull();
  });

  // Every request is a whole dialog, not a sentence: without a title there is
  // nothing to name the dialog with, and without a label the affirmative button
  // falls back to a bare "OK" — the `window.confirm` habit this issue removed.
  it("gives every warning a title and named affirmative button", () => {
    for (const request of [
      modeSwitchConfirm("solo", "collab", 2, false),
      modeSwitchConfirm("collab", "solo", 1, true),
    ]) {
      expect(request?.title.trim()).not.toBe("");
      expect(request?.confirmLabel.trim()).not.toBe("");
    }
  });
});
