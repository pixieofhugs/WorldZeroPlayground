/**
 * Mode-switch confirms. Switches are in-place (#321, #311), so only destructive
 * ones warn: leaving a live duel, or collab→solo dropping co-authors.
 */
import { describe, it, expect } from "vitest";
import { modeSwitchConfirm } from "../../components/confirm/composerConfirms";

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

  // Without a label the button falls back to a bare "OK".
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
