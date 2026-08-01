/**
 * Mode-switch confirm logic. Switches are now in-place (#321 solo↔collab, #311
 * duel), so the draft is always preserved — only genuinely destructive
 * transitions warn: leaving a live duel, or collab→solo dropping co-authors.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updatePraxis } from "../../api/praxis";
import { draftNeedsTitle, flushEdits, hasUnsavedEdits } from "./useEditPraxis";
// The mode-switch confirm moved out of the hook with the rest of them (#1082)
// and now returns a whole ConfirmRequest instead of a `window.confirm` string.
import { modeSwitchConfirm } from "../../components/confirm/composerConfirms";

vi.mock("../../api/praxis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/praxis")>()),
  updatePraxis: vi.fn(async () => ({})),
}));

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

/**
 * The manual flush behind Publish and Save draft (#1081). The harness runs no
 * effects, so the 2s debounce can't be exercised through the component — but
 * `flushEdits` takes its cancel as an argument precisely so the ordering that
 * makes a manual save safe is provable by calling it directly.
 */
describe("flushEdits", () => {
  const put = vi.mocked(updatePraxis);
  let log: string[];
  const cancelQueuedAutosave = () => {
    log.push("cancel");
  };

  beforeEach(() => {
    log = [];
    put.mockClear();
    put.mockImplementation(async () => {
      log.push("put");
      return {} as Awaited<ReturnType<typeof updatePraxis>>;
    });
  });

  it("cancels the queued autosave BEFORE writing, never after", async () => {
    await flushEdits({
      praxisId: 7,
      title: "Title",
      body: "typed one keystroke ago",
      lastSavedTitle: "Title",
      lastSavedBody: "",
      cancelQueuedAutosave,
    });
    // Cancel-then-write. The other order lets a debounce holding stale text land
    // after the manual save and overwrite it.
    expect(log).toEqual(["cancel", "put"]);
  });

  it("writes the text it was handed, so the last keystrokes go out too", async () => {
    const wrote = await flushEdits({
      praxisId: 7,
      title: "Title",
      body: "typed one keystroke ago",
      lastSavedTitle: "Title",
      lastSavedBody: "",
      cancelQueuedAutosave,
    });
    expect(wrote).toBe(true);
    expect(put).toHaveBeenCalledWith(7, {
      title: "Title",
      body_text: "typed one keystroke ago",
    });
  });

  it("still cancels the debounce when nothing changed, but issues no PUT (#360)", async () => {
    const wrote = await flushEdits({
      praxisId: 7,
      title: "Title",
      body: "Body",
      lastSavedTitle: "Title",
      lastSavedBody: "Body",
      cancelQueuedAutosave,
    });
    // On a collab that skipped PUT is load-bearing: it would reset every
    // member's has_submitted (ADR-0012).
    expect(wrote).toBe(false);
    expect(log).toEqual(["cancel"]);
    expect(put).not.toHaveBeenCalled();
  });

  it("sends an empty body as undefined rather than an empty string", async () => {
    await flushEdits({
      praxisId: 7,
      title: "Title",
      body: "",
      lastSavedTitle: "",
      lastSavedBody: "",
      cancelQueuedAutosave,
    });
    expect(put).toHaveBeenCalledWith(7, { title: "Title", body_text: undefined });
  });
});

/**
 * Save draft navigates away, so the one write it depends on has to be one the
 * backend will accept — otherwise the body text leaves with the page (#1081).
 */
describe("draftNeedsTitle", () => {
  it("refuses to leave when unsaved writing has no title to be saved under", () => {
    expect(draftNeedsTitle("", "a body I just typed", "", "")).toBe(true);
    expect(draftNeedsTitle("   ", "a body I just typed", "", "")).toBe(true);
  });

  it("lets a titled draft go", () => {
    expect(draftNeedsTitle("Title", "a body I just typed", "Title", "")).toBe(
      false,
    );
  });

  it("lets an untitled but fully-persisted draft go — there is nothing to lose", () => {
    expect(draftNeedsTitle("", "", "", "")).toBe(false);
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

/*
 * The invite/opponent picker's own-account exclusion used to be proven here, on
 * a `selfExcludedPickIds` helper that re-derived the rule client-side off a
 * `/me/characters` read. #1385 moved the rule to the one party that can answer
 * it — `GET /characters?exclude_own_account=true` — so it is now pinned at the
 * HTTP seam in `backend/tests/integration/test_characters.py`.
 */
