/**
 * Mode-switch confirm logic. Switches are in-place (#321 solo↔collab, #311
 * duel), so the draft is always preserved — only genuinely destructive
 * transitions warn: leaving a live duel, or collab→solo dropping co-authors.
 *
 * This file used to open with three describes over the composer's save
 * machinery: `hasUnsavedEdits`, `flushEdits`' cancel-then-write ordering, and
 * `draftNeedsTitle`. All three are gone with the debounced `PUT` they existed
 * to make safe (#1743). They were not deleted because they were awkward to
 * keep — they were deleted because there is no client-side write left to order,
 * no "last persisted" for anything to be dirty against, and no write that can
 * be rejected for want of a title. The praxis is written in its room, and the
 * rules that replace these are asserted server-side in
 * `backend/tests/integration/test_praxis_room.py`.
 */
import { describe, it, expect } from "vitest";
// The mode-switch confirm moved out of the hook with the rest of them (#1082)
// and now returns a whole ConfirmRequest instead of a `window.confirm` string.
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

/*
 * The invite/opponent picker's own-account exclusion used to be proven here, on
 * a `selfExcludedPickIds` helper that re-derived the rule client-side off a
 * `/me/characters` read. #1385 moved the rule to the one party that can answer
 * it — `GET /characters?exclude_own_account=true` — so it is now pinned at the
 * HTTP seam in `backend/tests/integration/test_characters.py`.
 */
