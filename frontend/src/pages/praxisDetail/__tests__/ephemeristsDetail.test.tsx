/**
 * The Ephemerists praxis-detail skin (#1120, ADR-0061); shared slots are in
 * `archetypeSlots.test.tsx`. Guards the layout contract (330px aside, crown at
 * both widths, bare report card) and neutral copy.
 */
import { describe, it, expect, vi } from "vitest";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aDuel, aDuelSide, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, RIVAL, VOTERS, aPraxisDetailState, indexOf, skinRenderer } from "../../../test/praxisDetail";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

const { voterMetalWordFits } = await import("../archetypes/EphemeristsPraxisDetail");

const PRAXIS = aPraxis({
  task_title: "The Sunk Causeway",
  task_faction_slug: "ephemerists",
  title: "Low Water, Third Reading",
  body_text: "Walked the causeway at the ebb and marked the stones.",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "ephemerists",
  members: [MEMBER],
});

const DUEL = aDuel({
  challenger: aDuelSide({ faction_slug: "ephemerists", points_from_votes: 18 }),
  opponent: RIVAL,
});

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("ephemerists", mocks);

describe("Ephemerists praxis detail — the inherited layout contract", () => {

  it("moves the score block rather than drawing it twice", () => {
    const wide = render(state());
    expect(wide.text.match(/Score/g)?.length, "one score block on desktop").toBe(1);
    expect(indexOf(wide.html, "Proof"), "proof precedes the aside rail").toBeLessThan(
      indexOf(wide.html, "Score"),
    );

    const phone = render(state(), "mobile");
    expect(phone.text.match(/Score/g)?.length, "one score block on mobile").toBe(1);
    expect(indexOf(phone.html, "Score"), "rail rides above the proof on mobile").toBeLessThan(
      indexOf(phone.html, "Proof"),
    );
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });
});

describe("Ephemerists praxis detail — copy is neutral (ADR-0061)", () => {
  it("reads the shared neutral words, not the design's", () => {
    const { text } = render(state());
    expect(text, "the body heading").toContain("Write-up");
    // Withdrawn voiced copy (#1156).
    for (const voiced of ["Canonical record", "The disputation", "Amend the record"]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced);
    }
    expect(render(state({ praxis: { ...PRAXIS, applied_metatasks: [] } })).text).not.toContain(
      "Metatasks",
    );
  });

  it("names the duel block only when there is a duel", () => {
    expect(render(state()).text, "no duel, no heading").not.toContain("The duel");

    const live = render(state({ praxis: { ...PRAXIS, duel_id: 5 }, duel: DUEL }));
    expect(live.text, "the shared word for it").toContain("The duel");
    // Readings are owned by `duelCard.test.tsx`.
    expect(live.text, "the shared live verdict").toContain("leads by");

    const declined = render(
      state({ praxis: { ...PRAXIS, duel_id: 5 }, duel: { ...DUEL, status: "declined" } }),
    );
    expect(declined.text).not.toContain("The duel");
  });

  it("mounts the owner's controls bare, and shows none to a visitor", () => {
    // The design's label has no neutral twin, so the cluster is unlabelled.
    // #1397: `/edit` on a submitted solo redirects back, so unsubmit is the way in.
    expect(render(state()).text, "visitor gets no owner controls").not.toContain(
      "unsubmit",
    );
    const owner = render(state({ isOwner: true }));
    expect(owner.text, "the shared invariant controls").toContain("unsubmit");
    expect(owner.html, "and nothing that round-trips").not.toContain("/praxis/1/edit");
    expect(owner.text, "and no label over them").not.toContain("Amend the record");
  });

  it("keeps moderation and system chrome on the shared neutral words", () => {
    const flagged = render(state({ praxis: { ...PRAXIS, moderation_status: "flagged" } }));
    expect(flagged.text, "the neutral banner label").toContain("FLAGGED");

    const failed = render(
      state({
        praxis: {
          ...PRAXIS,
          moderation_status: "failed",
          admin_note: "That is the wrong causeway.",
        },
      }),
    );
    expect(failed.text, "the admin note is the banner's body").toContain(
      "That is the wrong causeway.",
    );

    const { html } = render(state());
    expect(html, "the report card renders").toContain("Flag this praxis");
    expect(html, "on the shared neutral card chrome").toContain("sidebar-card");
  });
});

describe("Ephemerists praxis detail — the state axes", () => {
  it("renders the score readout from the shared resolver, not its own arithmetic", () => {
    const { text } = render(state());
    expect(text, "base").toContain("12");
    expect(text, "points from votes").toContain("4");
    expect(text, "total").toContain("16");
  });

  /** #1638: the tier word must be real text, not a `title` (screen readers). */
  it("strikes each vote as its metal, and keeps the metal's NAME reachable", () => {
    const { text, html } = render(state());
    expect(text, "the tier for 5").toContain("platinum");
    expect(text, "the tier for 3").toContain("silver");
    expect(html, "and never as a hover-only title").not.toContain('title="platinum"');
    expect(text, "no numeral beside the mark").not.toContain("III");
  });

  /** #2147: each metal in its own token; at 16px glyphs alone don't distinguish. */
  it("inks each vote's sigil in its own metal, on a rule-brass rim", () => {
    const { html } = render(state());
    expect(html, "rank 5").toContain(
      'stroke="var(--faction-ephemerists-metal-platinum)"',
    );
    expect(html, "rank 3").toContain('stroke="var(--faction-ephemerists-metal-silver)"');
    // A border takes rule brass, not mark brass (#2140).
    expect(html, "the chip's rim").toContain(
      "1px solid var(--faction-ephemerists-plate-brass-rule)",
    );
  });

  /**
   * #2147: the word shows only where the row has room, as ONE span. Width comes
   * from a `ResizeObserver`, so the predicate is tested directly.
   */
  it("prints the metal's word only where the row has room", () => {
    expect(voterMetalWordFits(330), "a desktop aside").toBe(true);
    expect(voterMetalWordFits(200), "a 320px phone").toBe(false);
    // Unmeasured reads as roomy: the worst case is a cramped visible word.
    expect(voterMetalWordFits(null), "not measured yet").toBe(true);

    const { html, text } = render(state());
    expect(html, "printed, not hidden, at the unmeasured default").not.toContain(
      'class="sr-only">platinum',
    );
    // Counted on TEXT: the markup also names it in the stroke token.
    expect(text.match(/platinum/g)?.length, "said once").toBe(1);
  });

  it("credits every co-author and shows the members section on a collab", () => {
    const solo = render(state());
    expect(solo.html, "solo links one author").toContain('href="/characters/3"');
    expect(solo.text, "and draws no members section").not.toContain("Members");

    // Members is gated on `type` (#1274).
    const collab = render(
      state({ praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] } }),
    );
    expect(collab.html, "both co-authors are linked").toContain('href="/characters/4"');
    expect(collab.text, "and the members section renders").toContain("Members");
  });

  it("draws the proof and the write-up only when there is something to draw", () => {
    const bare = render(state({ praxis: { ...PRAXIS, media_items: [], body_text: "" } }));
    expect(bare.text).not.toContain("Proof");
    expect(bare.text).not.toContain("Write-up");
  });
});

describe("Ephemerists praxis detail — the colophon is undated here (#2124)", () => {
  /**
   * Privacy (#2124): a praxis date is the player's `submitted_at`, so dating the
   * colophon would put it beside a real latitude. Task detail keeps its date.
   */
  it("prints the station but never strikes it with a date", () => {
    const { text } = render(state());
    expect(text, "the provenance line still names the station").toContain("+44° 03′");
    expect(text, "and carries no struck date beside it").not.toContain("Plate struck");
  });
});
