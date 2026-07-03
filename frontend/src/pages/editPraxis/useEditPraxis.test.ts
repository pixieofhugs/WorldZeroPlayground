/**
 * Mode-switch confirm logic. Switches are now in-place (#321 solo↔collab, #311
 * duel), so the draft is always preserved — only genuinely destructive
 * transitions warn: leaving a live duel, or collab→solo dropping co-authors.
 */
import { describe, it, expect } from "vitest";
import { hasUnsavedEdits, modeSwitchPrompt } from "./useEditPraxis";

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
