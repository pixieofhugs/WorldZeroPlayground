/**
 * Mode-switch confirm logic. Switches are now in-place (#321 solo↔collab, #311
 * duel), so the draft is always preserved — only genuinely destructive
 * transitions warn: leaving a live duel, or collab→solo dropping co-authors.
 */
import { describe, it, expect } from "vitest";
import { modeSwitchPrompt } from "./useEditPraxis";

describe("modeSwitchPrompt", () => {
  it("warns that co-authors will be dropped on collab → solo with a crew (#155)", () => {
    expect(modeSwitchPrompt("solo", "collab", 2, false)).toMatch(/co-authors/i);
  });

  it("warns that the duel is cancelled when leaving a live duel", () => {
    expect(modeSwitchPrompt("collab", "solo", 1, true)).toMatch(/duel/i);
    expect(modeSwitchPrompt("solo", "solo", 1, true)).toMatch(/duel/i);
  });

  it("does not warn when re-selecting duel while dueling", () => {
    expect(modeSwitchPrompt("duel", "solo", 1, true)).toBeNull();
  });

  it("proceeds silently for a lossless switch (solo → collab, or solo crew)", () => {
    expect(modeSwitchPrompt("collab", "solo", 1, false)).toBeNull();
    expect(modeSwitchPrompt("solo", "collab", 1, false)).toBeNull();
  });
});
