/**
 * The Everymen praxis-detail skin (#1123); shared slots are in
 * `archetypeSlots.test.tsx`. Guards where the design was wrong: the layout
 * contract (crown at both widths despite `showCrownMobile: false`), neutral
 * moderation chrome (ADR-0061), and no voiced copy.
 */
import { describe, it, expect, vi } from "vitest";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aMetatask, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, VOTERS, aPraxisDetailState, indexOf, skinRenderer } from "../../../test/praxisDetail";
import { collabCopy } from "../../../components/collab/collabCopy";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

const METATASK = aMetatask({ metatask_faction_slug: "everymen" });

const PRAXIS = aPraxis({
  task_title: "Sweep The Long Corridor",
  task_faction_slug: "everymen",
  title: "Filed On The Late Shift",
  body_text: "Swept it end to end before the whistle.",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "everymen",
  members: [MEMBER],
});

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("everymen", mocks);

describe("Everymen praxis detail — the layout contract it may not restyle", () => {

  it("moves the rail above the proof on mobile and into the aside on desktop", () => {
    const wide = render(state());
    expect(wide.text.match(/Score/g)?.length, "one score block on desktop").toBe(1);
    expect(indexOf(wide.html, "Proof"), "proof precedes the aside rail").toBeLessThan(
      indexOf(wide.html, "Score"),
    );

    const phone = render(state(), "mobile");
    expect(phone.text.match(/Score/g)?.length, "one score block on mobile").toBe(1);
    expect(indexOf(phone.html, "Score"), "rail rides above the proof").toBeLessThan(
      indexOf(phone.html, "Proof"),
    );
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });
});

describe("Everymen praxis detail — the costume's boundary", () => {
  it("keeps moderation chrome neutral, in the shared words", () => {
    // ADR-0061: moderation is never voiced.
    const flagged = state({ praxis: { ...PRAXIS, moderation_status: "flagged" } });
    expect(render(flagged).text).toContain("FLAGGED");
    expect(render(flagged).text, "no union voice on a moderation banner").not.toContain(
      "GRIEVANCE",
    );

    const failed = state({
      praxis: {
        ...PRAXIS,
        moderation_status: "failed",
        admin_note: "Wrong corridor.",
      },
    });
    expect(render(failed).text, "the admin note is the banner's body").toContain(
      "Wrong corridor.",
    );
    expect(render(failed).text).not.toContain("STEWARD");

    const steward = state({ showAdminBar: true });
    expect(render(steward).text, "the shared steward bar").toContain("ADMIN");
  });

  it("builds none of the design's voiced content labels", () => {
    const { text } = render(
      state({
        praxis: {
          ...PRAXIS,
          type: "collab",
          members: [MEMBER, CO_MEMBER],
          applied_metatasks: [METATASK],
        },
      }),
    );
    for (const voiced of [
      "THE EVIDENCE",
      "WAGE TALLY",
      "FILED JOINTLY BY",
      "EXTRA DUTIES LOGGED",
      "THE CONTEST",
      "THE FLOOR",
    ]) {
      expect(text, `voiced label not built: ${voiced}`).not.toContain(voiced);
    }
    for (const neutral of ["Proof", "Score", "Members", "Metatasks", "Discussion"]) {
      expect(text, `shared neutral label: ${neutral}`).toContain(neutral);
    }
  });

  it("prints the faction's NAME in the masthead, which is not a voice", () => {
    // From `factions:names.everymen`.
    expect(render(state()).text).toContain("Everymen");
    expect(render(state(), "mobile").text).toContain("Everymen");
  });
});

describe("Everymen praxis detail — the state axes", () => {
  it("renders the score readout from the shared resolver, with no arithmetic of its own", () => {
    const { text } = render(state());
    expect(text, "base").toContain("12");
    expect(text, "points from votes").toContain("4");
    expect(text, "total").toContain("16");
    expect(text, "neutral era hides the multiplier row").not.toContain("mult");
  });

  it("shows applied metatasks read-only — no add chip", () => {
    const sealed = state({ praxis: { ...PRAXIS, applied_metatasks: [METATASK] } });
    expect(render(sealed).text, "the seal's condition line").toContain("Composting");
    expect(render(sealed).text, "no add slot: apply_metatask needs in_progress").not.toContain(
      "Add a metatask",
    );
    expect(render(state()).text, "nothing when none applied").not.toContain("Composting");
  });

  it("credits every co-author and shows the members section on a published collab", () => {
    const solo = render(state());
    expect(solo.html, "solo links one author").toContain('href="/characters/3"');
    expect(solo.text, "and draws no members section").not.toContain("Members");

    const collab = state({
      praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] },
    });
    const { html, text } = render(collab);
    expect(html, "each co-author is reachable").toContain('href="/characters/4"');
    expect(text).toContain("Beth");
    expect(text, "the domain noun, not the design's crew").toContain("Members");
  });

  it("draws the roster off the payload, not the design's invented column", () => {
    // The design's third column is invented data (#1123); `CollabRoster` shows
    // whether each member has filed.
    const collab = state({
      praxis: {
        ...PRAXIS,
        type: "collab",
        members: [MEMBER, { ...CO_MEMBER, has_submitted: false }],
      },
    });
    // Shared `collabCopy` words (#1812).
    const { text } = render(collab);
    expect(text, "filed").toContain(collabCopy(null, "pillCast"));
    expect(text, "not filed").toContain(collabCopy(null, "pillWeaving"));
    for (const invented of ["inventory", "shelving", "the hours"]) {
      expect(text, `invented column not built: ${invented}`).not.toContain(invented);
    }
  });
});
