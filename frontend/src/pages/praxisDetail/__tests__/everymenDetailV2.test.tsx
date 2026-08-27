/**
 * The Everymen praxis-detail skin — dress over the shared layout (#1123, epic
 * #1085).
 *
 * `archetypeSlots.test.tsx` already walks this archetype for the CONTENT slots
 * every praxis-detail page must emit, and it picks the skin up automatically
 * from the manifest. This file guards the three things that are specific to
 * dressing the shared page, all of which the design got wrong in a way a build
 * could silently inherit:
 *
 *  - the layout facts a skin must not "fix" — the 330px aside track, the
 *    responsive move of the rail, and the crown at BOTH form factors (the design
 *    draws `showCrownMobile: false`);
 *  - the costume's boundary — moderation and system chrome stay neutral
 *    (ADR-0061), so the design's voiced moderation words
 *    must not appear;
 *  - copy stays the shared neutral `detail.*` set, so none of the union
 *    vocabulary recorded on the issue is built.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md).
 * `useFormFactor` is MOCKED rather than driven off `matchMedia`. Light vs dark
 * is a pure `[data-theme]` cascade with no branch in the component, so there is
 * nothing here to assert about it — it is an eyeball check.
 */
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aCharacter, aCurrentUser, aMetatask, aPraxis } from "../../../test/fixtures";
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

const VIEWER = aCurrentUser({
  character: aCharacter({ faction_slug: "everymen", level: 4 }),
});

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("everymen", mocks);

describe("Everymen praxis detail — the layout contract it may not restyle", () => {
  it("gives the desktop aside the shared 330px track and drops it on mobile", () => {
    expect(render(state()).html, "the eight designs' aside track").toContain(
      "0 0 330px",
    );
    expect(render(state(), "mobile").html, "no fixed track on mobile").not.toContain(
      "0 0 330px",
    );
  });

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

  it("shows the crown at BOTH form factors, against the design's own note", () => {
    // The design draws `showCrownMobile: false`. Overruled: the crown is one
    // canonical mark, keyed only on `is_top_for_task`.
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
    // the page, so the newsprint is a class on the 1200 column.
    const { html } = render(state());
    expect(html, "the dispatch sheet").toContain("em-dispatch");
    expect(html, "no full-bleed ground").not.toContain("position:fixed");
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });
});

describe("Everymen praxis detail — the costume's boundary", () => {
  it("keeps moderation chrome neutral, in the shared words", () => {
    // ADR-0061: content slots carry the voice, moderation does not.
    // The design voices all of these; the vocabulary is recorded on #1123 and
    // deliberately not built.
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

  it("leaves the report card outside the costume", () => {
    const { html } = render(state());
    expect(html, "the neutral card renders on the page").toContain("Flag this praxis");
    expect(html, "wearing the shared neutral chrome").toContain("sidebar-card");
  });

  it("builds none of the design's voiced content labels", () => {
    // Recorded on #1123 for a later voiced pass; the shipped copy is the shared
    // neutral `detail.*` set.
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
    // `factions:names.everymen`, the same catalog every other surface reads —
    // not a bespoke masthead string minted for this page.
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
    // `PraxisMemberOut` carries no per-member contribution label, so the
    // design's "inventory" / "shelving" / "the hours" third column is invented
    // data (owner ruling on #1123). `CollabRoster` fills that slot with the fact
    // the payload DOES have: whether each member has filed their part.
    const collab = state({
      praxis: {
        ...PRAXIS,
        type: "collab",
        members: [MEMBER, { ...CO_MEMBER, has_submitted: false }],
      },
    });
    // The words are `collabCopy`'s — not copy this page mints. They used to be
    // the Everymen's ("signed off" / "still on the clock"); #1812 deleted all
    // eight faction voices, so the roster reads the shared tier here too.
    const { text } = render(collab);
    expect(text, "filed").toContain(collabCopy(null, "pillCast"));
    expect(text, "not filed").toContain(collabCopy(null, "pillWeaving"));
    for (const invented of ["inventory", "shelving", "the hours"]) {
      expect(text, `invented column not built: ${invented}`).not.toContain(invented);
    }
  });

  it("shows owner controls to a member and nothing to a visitor", () => {
    // #1397: the cluster is anchored on the UNSUBMIT control now. On a
    // submitted solo `/edit` redirects straight back to this page, so the edit
    // link is hidden and unsubmitting is the way into the composer.
    expect(render(state()).text, "a visitor gets no owner controls").not.toContain(
      "unsubmit",
    );
    const owner = state({ isOwner: true, user: VIEWER });
    expect(render(owner).text).toContain("unsubmit");
    expect(render(owner).html, "and nothing that round-trips").not.toContain(
      'href="/praxis/1/edit"',
    );
  });

  it("lists who voted and each voter's own rung, never an average", () => {
    const { html, text } = render(state());
    expect(text).toContain("Who voted");
    expect(html).toContain('href="/characters/11"');
    expect(text, "the count, not the mean").toContain("2 votes");

    expect(render(state({ voters: [] })).text, "no empty voter panel").not.toContain(
      "Who voted",
    );
  });
});
