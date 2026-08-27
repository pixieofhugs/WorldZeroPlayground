/**
 * The Ephemerists praxis-detail skin (#1120, epic #1085, ADR-0061).
 *
 * `archetypeSlots.test.tsx` already walks this archetype for the slots EVERY
 * praxis-detail skin must emit — it picks it up from the manifest the moment the
 * registration lands, with no edit here. This file guards what is specific to
 * the SKIN: the three contract facts the eight faction designs settled (330px
 * aside, crown at both form factors, an undressed report card), and the fact
 * that the page speaks entirely in the shared neutral words — the Ephemerists'
 * own vocabulary is recorded on #1120 and deliberately not built.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md).
 * `useFormFactor` is MOCKED rather than driven off `matchMedia` — the mobile
 * assertions are about the form factor reaching the page, not about a real
 * viewport. Light vs dark is a pure `[data-theme]` cascade with no branch in
 * this component, so there is nothing to assert about it here; it is an eyeball
 * check, as is the cornice glow (a CSS animation).
 */
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aDuel, aDuelSide, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, VOTERS, aPraxisDetailState, indexOf, skinRenderer } from "../../../test/praxisDetail";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// `voterMetalWordFits` is a pure export of the archetype module, imported after
// the mock so the module picks it up.
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

/** A settled duel this praxis is the challenger side of. */
const DUEL = aDuel({
  challenger: aDuelSide({ faction_slug: "ephemerists", points_from_votes: 18 }),
  opponent: aDuelSide({
    praxis_id: 2,
    character_id: 4,
    display_name: "Rax",
    faction_slug: "snide",
    points_from_votes: 15.4,
  }),
});

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("ephemerists", mocks);

describe("Ephemerists praxis detail — the inherited layout contract", () => {
  it("gives the desktop aside a 330px track and drops the track on mobile", () => {
    expect(render(state()).html, "the eight designs' aside track").toContain("0 0 330px");
    expect(render(state()).html, "the Unaffiliated outlier width is gone").not.toContain(
      "340px",
    );
    // Mobile drops the TRACK, not its contents — the rail stacks into flow.
    expect(render(state(), "mobile").html).not.toContain("0 0 330px");
  });

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

  it("shows the crown at BOTH form factors on a crowned praxis", () => {
    // The mark is the score stamp's corner fleur now — #1710 retired the
    // hero banner. The score block is in both layouts, so it is still never
    // form-factor gated, and it is still the one canonical `TaskCrown`.
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned, "desktop").html, "crown on desktop").toContain(crown);
    expect(render(crowned, "mobile").html, "crown on mobile too").toContain(crown);
    expect(render(state(), "mobile").html, "and only when crowned").not.toContain(
      crown,
    );
  });

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background must still show around
    // the page, so the papyrus is the COLUMN's own sheet.
    const { html } = render(state());
    expect(html, "the plate sheet is the column").toContain("eph-plate-sheet");
    expect(html, "and it is not pinned to the viewport").not.toContain("fixed");
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });

  it("hides the comment region on a praxis that is not visible", () => {
    expect(
      render(state({ praxis: { ...PRAXIS, moderation_status: "hidden" } })).text,
    ).not.toContain("Discussion");
  });
});

describe("Ephemerists praxis detail — copy is neutral (ADR-0061)", () => {
  it("reads the shared neutral words, not the design's", () => {
    const { text } = render(state());
    expect(text, "the body heading").toContain("Write-up");
    // The words this skin shipped for a day (#1156) and gave back with the
    // withdrawn amendment. They live on #1120 now, recorded and unbuilt.
    for (const voiced of ["Canonical record", "The disputation", "Amend the record"]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced);
    }
    // A heading only when there is something under it.
    expect(render(state({ praxis: { ...PRAXIS, applied_metatasks: [] } })).text).not.toContain(
      "Metatasks",
    );
  });

  it("names the duel block only when there is a duel", () => {
    expect(render(state()).text, "no duel, no heading").not.toContain("The duel");

    const live = render(state({ praxis: { ...PRAXIS, duel_id: 5 }, duel: DUEL }));
    expect(live.text, "the shared word for it").toContain("The duel");
    // The card is MOUNTED, not re-narrated: it already implements three
    // readings (live / won by default / final) and none at all on `declined`.
    // Only the live reading is checked here — `duelCard.test.tsx` owns the rest.
    expect(live.text, "the shared live verdict").toContain("leads by");

    // A declined challenge draws no card at all, so no heading either.
    const declined = render(
      state({ praxis: { ...PRAXIS, duel_id: 5 }, duel: { ...DUEL, status: "declined" } }),
    );
    expect(declined.text).not.toContain("The duel");
  });

  it("mounts the owner's controls bare, and shows none to a visitor", () => {
    // The design labels this cluster ("Amend the record"). That label was the
    // one voiced slot with no neutral twin, so it is gone rather than restated
    // — the other seven skins mount the cluster unlabelled too.
    // #1397: the cluster is anchored on the UNSUBMIT control now. On a
    // submitted solo `/edit` redirects straight back to this page, so the edit
    // link is hidden and unsubmitting is the way into the composer.
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

    // The report card is deliberately outside the costume: neutral chrome, its
    // own token set, no plate dress.
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

  /**
   * #1638 — "who voted" is THE STRUCK METAL: the sigil for the metal that voter
   * cast, in a brass-ringed disc, with the tier WORD carried as real text
   * rather than on `title`.
   *
   * The name reaching text is the load-bearing half, and it is the half the
   * design's `title` would have failed silently: an attribute is not text
   * content, so a `title`-only build renders identically and says nothing to a
   * screen reader. This assertion is what tells the two apart.
   */
  it("strikes each vote as its metal, and keeps the metal's NAME reachable", () => {
    const { text, html } = render(state());
    // The word still comes from the shipped `reframeLabel` — no invented copy —
    // and reaches the accessibility tree as text rather than as a tooltip.
    expect(text, "the tier for 5").toContain("platinum");
    expect(text, "the tier for 3").toContain("silver");
    expect(html, "and never as a hover-only title").not.toContain('title="platinum"');
    // The roman numerals went with the vote plate's own pips: the sigil in the
    // disc is what says which rank, on both surfaces.
    expect(text, "no numeral beside the mark").not.toContain("III");
  });

  /**
   * #2147 — the chip is the readable column down the right margin, so each
   * metal is inked in ITS OWN token. Shipped with all five stroked in one
   * `-plate-ochre`, which made the glyph the sole difference between a lead
   * vote and a platinum one; at 16px Saturn and Venus are too close for that.
   *
   * A colour is normally an eyeball check, but "which of five" is not: this
   * asserts the two fixture rows do not share an ink, which is exactly what a
   * regression back to one shared constant would break.
   */
  it("inks each vote's sigil in its own metal, on a rule-brass rim", () => {
    const { html } = render(state());
    expect(html, "rank 5").toContain(
      'stroke="var(--faction-ephemerists-metal-platinum)"',
    );
    expect(html, "rank 3").toContain('stroke="var(--faction-ephemerists-metal-silver)"');
    // A border is a LINE, so it takes the rule brass and not the mark brass
    // (#2140's split, landed by #2141).
    expect(html, "the chip's rim").toContain(
      "1px solid var(--faction-ephemerists-plate-brass-rule)",
    );
  });

  /**
   * #2147 — the metal's word prints between the name and the chip where the row
   * has room and drops where it does not, and it is ONE span either way so the
   * row reads "name, platinum" exactly once at every width.
   *
   * The width itself arrives from a `ResizeObserver`, which this harness has no
   * DOM to run, so the decision is tested at the pure predicate and the DOM is
   * asserted in the unmeasured state the harness actually renders. The narrow
   * render is the eyeball check named on the PR.
   */
  it("prints the metal's word only where the row has room", () => {
    expect(voterMetalWordFits(330), "a desktop aside").toBe(true);
    expect(voterMetalWordFits(200), "a 320px phone").toBe(false);
    // Unmeasured — first paint, SSR, and this harness. Reads as roomy: the word
    // is the same span either way, so the failure mode is a visible word on a
    // cramped row, never a row that cannot say which metal.
    expect(voterMetalWordFits(null), "not measured yet").toBe(true);

    const { html, text } = render(state());
    expect(html, "printed, not hidden, at the unmeasured default").not.toContain(
      'class="sr-only">platinum',
    );
    // One span, not a visible copy beside a hidden one. Counted on the TEXT:
    // the markup names the metal a second time in the sigil's stroke token.
    expect(text.match(/platinum/g)?.length, "said once").toBe(1);
  });

  it("credits every co-author and shows the members section on a collab", () => {
    const solo = render(state());
    expect(solo.html, "solo links one author").toContain('href="/characters/3"');
    expect(solo.text, "and draws no members section").not.toContain("Members");

    // `type` matters as much as the crew: the Members section is gated on it
    // now, so a collab fixture has to say it is one (#1274).
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
   * #2143 moved the datum row to the foot of the sheet and #2124 closed into it
   * with a PLACEMENT requirement: the coordinates must not sit adjacent to the
   * author, the date-of-submission, or any other player-scoped field. On a
   * praxis the surface's own date IS `submitted_at`, so passing it to
   * `EphemeristsColophon` puts a player's posting date and a real latitude in
   * ONE SENTENCE — which is the inference #2124 was filed about, not merely
   * adjacency to it.
   *
   * The undated form is therefore a requirement of this surface and not a
   * styling choice, and nothing else would notice it going away: the component's
   * own tests cover both branches, and a `date` prop restored here would render
   * perfectly and read wrong. `EphemeristsTaskDetail` keeps its date — a task's
   * `created_at` belongs to the task, not to a player.
   */
  it("prints the station but never strikes it with a date", () => {
    const { text } = render(state());
    expect(text, "the provenance line still names the station").toContain("+44° 03′");
    expect(text, "and carries no struck date beside it").not.toContain("Plate struck");
  });
});
