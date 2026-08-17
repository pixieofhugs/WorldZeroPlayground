/**
 * When the composer holds (#1080, ADR-0059).
 *
 * `publish()` no longer redirects for a multi-party cast — it lets the derived
 * phase flip to `waiting`, and `EditPraxis.tsx` swaps the waiting surface in for
 * the faction archetype. Every rule about *when* that happens lives in this one
 * pure function, so it can be asserted without a DOM.
 */
import { describe, it, expect } from "vitest";
import type { DuelDetailOut, DuelStatus } from "../../../../api/duel";
import type { PraxisMemberOut, PraxisOut } from "../../../../api/praxis";
import { deriveEditPraxisPhase } from "../../useEditPraxis";

const ME = 1;
const THEM = 2;

function member(id: number, hasSubmitted: boolean): PraxisMemberOut {
  return {
    id,
    praxis_id: 1,
    character_id: id,
    character_display_name: `M${id}`,
    has_submitted: hasSubmitted,
    is_done: false,
    joined_at: "2026-01-01T00:00:00Z",
    nudged_at: null,
    submitted_at: null,
  };
}

function praxis(overrides: Partial<PraxisOut>): PraxisOut {
  return {
    id: 1,
    type: "solo",
    status: "in_progress",
    moderation_status: "visible",
    duel_id: null,
    members: [],
    ...overrides,
  } as unknown as PraxisOut;
}

function duel(status: DuelStatus, forfeitedBy: number | null = null): DuelDetailOut {
  return {
    id: 7,
    status,
    forfeited_by_character_id: forfeitedBy,
  } as unknown as DuelDetailOut;
}

describe("deriveEditPraxisPhase — collab", () => {
  it("holds the composer once my part is in and co-authors are still weaving", () => {
    const collab = praxis({
      type: "collab",
      members: [member(ME, true), member(THEM, false)],
    });
    expect(deriveEditPraxisPhase(collab, null, ME)).toBe("waiting");
  });

  it("keeps the normal composer for the HOLDOUT — others cast, I have not", () => {
    // Explicitly not this surface (#1080): what the holdout needs is an editor.
    const collab = praxis({
      type: "collab",
      members: [member(ME, false), member(THEM, true)],
    });
    expect(deriveEditPraxisPhase(collab, null, ME)).toBe("composing");
  });

  it("does not hold once every part is cast — that beat is CollabSuccess (#591)", () => {
    const collab = praxis({
      type: "collab",
      members: [member(ME, true), member(THEM, true)],
    });
    expect(deriveEditPraxisPhase(collab, null, ME)).toBe("composing");
  });

  it("does not hold a one-member collab — there is nobody to wait for", () => {
    const collab = praxis({ type: "collab", members: [member(ME, true)] });
    expect(deriveEditPraxisPhase(collab, null, ME)).toBe("composing");
  });

  it("hands off a published solo — no roster, nothing to wait for (#1164)", () => {
    // Was `composing`, i.e. a LOCKED COMPOSER. The owner ruling on #1164 sends
    // this one to the read page instead; the completed reading is for praxes
    // with a crew to confirm.
    const solo = praxis({ status: "submitted", members: [member(ME, true)] });
    expect(deriveEditPraxisPhase(solo, null, ME)).toBe("handoff");
  });

  it("hands off a published ONE-member collab too — same emptiness", () => {
    const collab = praxis({
      type: "collab",
      status: "submitted",
      members: [member(ME, true)],
    });
    expect(deriveEditPraxisPhase(collab, null, ME)).toBe("handoff");
  });
});

describe("deriveEditPraxisPhase — the collab is published (#1164)", () => {
  it("shows the completed reading rather than a locked composer", () => {
    const collab = praxis({
      type: "collab",
      status: "submitted",
      members: [member(ME, true), member(THEM, true)],
    });
    expect(deriveEditPraxisPhase(collab, null, ME)).toBe("completed");
  });

  it("reads `submitted` off the STATUS, not off the consensus gate", () => {
    // A lapsed window auto-publishes with a holdout still outstanding
    // (ADR-0012), so the gate says `holdout` while the praxis is already
    // published. The status is the fact; the gate is not.
    const autoPublished = praxis({
      type: "collab",
      status: "submitted",
      members: [member(ME, false), member(THEM, true)],
    });
    expect(deriveEditPraxisPhase(autoPublished, null, ME)).toBe("completed");
  });

  it("still holds the WAITING reading while the collab is mid-consensus", () => {
    const pending = praxis({
      type: "collab",
      status: "pending",
      members: [member(ME, true), member(THEM, false)],
    });
    expect(deriveEditPraxisPhase(pending, null, ME)).toBe("waiting");
  });
});

describe("deriveEditPraxisPhase — duel", () => {
  const cast = { duel_id: 7, status: "submitted" as const, members: [member(ME, true)] };

  it("holds once my side is sealed and the duel is live", () => {
    expect(deriveEditPraxisPhase(praxis(cast), duel("active"), ME)).toBe("waiting");
  });

  it("holds when I sealed before the rival even answered the challenge", () => {
    expect(deriveEditPraxisPhase(praxis(cast), duel("pending"), ME)).toBe("waiting");
  });

  it("gives a settled or resolved duel the completed reading (#1164)", () => {
    // Both were `composing` — a locked composer. The OUTCOME still belongs to
    // the read page (ADR-0059); what changes is that `/edit` no longer answers
    // with a disabled form, it answers with a link.
    expect(deriveEditPraxisPhase(praxis(cast), duel("settled"), ME)).toBe(
      "completed",
    );
    expect(deriveEditPraxisPhase(praxis(cast), duel("resolved"), ME)).toBe(
      "completed",
    );
  });

  it("hands off a DECLINED challenge — it never became a duel", () => {
    // What is left is an ordinary published solo praxis, so it leaves like one.
    expect(deriveEditPraxisPhase(praxis(cast), duel("declined"), ME)).toBe(
      "handoff",
    );
  });

  it("does not hold a forfeited duel", () => {
    // Deliberately untouched by #1164: a forfeit is an unsubmit, so the
    // forfeiter's own side is back OUT and "both sides are in" would be false.
    expect(deriveEditPraxisPhase(praxis(cast), duel("active", THEM), ME)).toBe(
      "composing",
    );
    expect(deriveEditPraxisPhase(praxis(cast), duel("settled", THEM), ME)).toBe(
      "composing",
    );
  });

  it("does not hold a duel side that has not cast yet", () => {
    const open = praxis({ duel_id: 7, status: "in_progress", members: [member(ME, false)] });
    expect(deriveEditPraxisPhase(open, duel("active"), ME)).toBe("composing");
  });

  it("waits for the duel detail rather than drawing a rival it cannot name", () => {
    expect(deriveEditPraxisPhase(praxis(cast), null, ME)).toBe("composing");
  });
});

describe("deriveEditPraxisPhase — guards", () => {
  it("is composing with no praxis loaded", () => {
    expect(deriveEditPraxisPhase(null, null, ME)).toBe("composing");
  });

  it("leaves a moderated praxis to the archetype's own locked state", () => {
    const hidden = praxis({
      type: "collab",
      moderation_status: "hidden",
      members: [member(ME, true), member(THEM, false)],
    });
    expect(deriveEditPraxisPhase(hidden, null, ME)).toBe("composing");
  });
});
