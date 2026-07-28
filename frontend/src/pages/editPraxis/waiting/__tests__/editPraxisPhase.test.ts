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
    joined_at: "2026-01-01T00:00:00Z",
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

  it("keeps the solo redirect", () => {
    const solo = praxis({ status: "submitted", members: [member(ME, true)] });
    expect(deriveEditPraxisPhase(solo, null, ME)).toBe("composing");
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

  it("does not hold a settled or resolved duel — stage 3 is the read page's", () => {
    expect(deriveEditPraxisPhase(praxis(cast), duel("settled"), ME)).toBe("composing");
    expect(deriveEditPraxisPhase(praxis(cast), duel("resolved"), ME)).toBe("composing");
    expect(deriveEditPraxisPhase(praxis(cast), duel("declined"), ME)).toBe("composing");
  });

  it("does not hold a forfeited duel", () => {
    expect(deriveEditPraxisPhase(praxis(cast), duel("active", THEM), ME)).toBe(
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
