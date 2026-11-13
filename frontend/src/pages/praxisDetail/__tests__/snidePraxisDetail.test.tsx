/**
 * S.N.I.D.E. praxis-detail skin (#1118). Shared slots: `archetypeSlots.test.tsx`.
 * Voiced vocabulary is recorded on #1119, not built. `useFormFactor` is mocked.
 */
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { DuelDetailOut } from "../../../api/duel";
import { aCharacter, aCurrentUser, aDuel, aDuelSide, aMetatask, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, VOTERS, aPraxisDetailState, indexOf, skinRenderer } from "../../../test/praxisDetail";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

const PRAXIS = aPraxis({
  task_title: "A Chore Nobody Logged",
  task_faction_slug: "snide",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "snide",
  members: [MEMBER],
});

const VIEWER = aCurrentUser({ character: aCharacter({ faction_slug: "snide", level: 4 }) });

const duel = (overrides: Partial<DuelDetailOut> = {}): DuelDetailOut =>
  aDuel({
    challenger: aDuelSide({ faction_slug: "snide", points_from_votes: 18 }),
    opponent: aDuelSide({
      praxis_id: 2,
      character_id: 4,
      display_name: "Rax",
      faction_slug: "coven",
      points_from_votes: 15.4,
    }),
    ...overrides,
  });

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

const render = skinRenderer("snide", mocks);

describe("S.N.I.D.E. praxis detail — the inherited layout contract", () => {
  it("draws no navigation of its own, at either width (#2102)", () => {
    // The breadcrumb is site chrome (`components/nav/Breadcrumb`); its contents
    // are pinned in `pages/__tests__/breadcrumbAcrossSurfaces`.
    for (const factor of ["desktop", "mobile"] as const) {
      const { html } = render(state(), factor);
      const sheet = html.slice(html.indexOf("</nav>") + 1);
      expect(sheet, `${factor}: no crumb inside the surface`).not.toContain('href="/tasks"');
      expect(html, `${factor}: no phone back bar`).not.toContain('href="/praxis"');
    }
  });

  it("gives the desktop aside the eight designs' 330px track, and none on mobile", () => {
    const wide = render(state());
    expect(wide.html, "the aside track").toContain("0 0 330px");
    expect(wide.html, "not the Unaffiliated outlier width").not.toContain("340px");
    expect(render(state(), "mobile").html, "mobile drops the TRACK").not.toContain(
      "0 0 330px",
    );
  });

  it("moves the rail above the proof on mobile, and builds it once either way", () => {
    const wide = render(state());
    expect(wide.text.match(/Score/g)?.length, "one score block on desktop").toBe(1);
    expect(indexOf(wide.html, "Proof"), "proof precedes the aside rail").toBeLessThan(
      indexOf(wide.html, "Score"),
    );

    const phone = render(state(), "mobile");
    expect(phone.text.match(/Score/g)?.length, "one score block on mobile").toBe(1);
    expect(indexOf(phone.html, "Score"), "the rail rides above the proof").toBeLessThan(
      indexOf(phone.html, "Proof"),
    );
  });

  it("shows the crown at BOTH form factors on a crowned praxis", () => {
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned, "desktop").html, "crown on desktop").toContain(crown);
    expect(render(crowned, "mobile").html, "crown on mobile too").toContain(crown);
    expect(render(state(), "mobile").html, "and only when crowned").not.toContain(
      crown,
    );
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "no second heading for one list").not.toContain("0 comments");
  });

  it("hides the comment region on a praxis that is not visible", () => {
    const hidden = state({ praxis: { ...PRAXIS, moderation_status: "hidden" } });
    expect(render(hidden).text).not.toContain("Discussion");
  });

  it("collapses the clipping into the black slab, censor rules and all (#2066)", () => {
    // One theme-invariant ground, so no flipping ink lands on a sheet.
    const { html } = render(state());
    expect(html, "the stock has no consumer left on this page").not.toContain(
      "--faction-snide-note-paper",
    );
    expect(html, "one ground, and it is the plate").toContain("--faction-snide-card-bg");
  });

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028. `.snide-backdrop` is the `position: fixed`
    // mount of the same wall paint.
    const { html } = render(state());
    expect(html, "the column's own wall").toContain("snd-detail-sheet");
    expect(html, "not the full-viewport mount").not.toContain("snide-backdrop");
  });
});

describe("S.N.I.D.E. praxis detail — copy is neutral (ADR-0061)", () => {
  it("reads the shared neutral words in every content slot", () => {
    const collab = state({
      praxis: {
        ...PRAXIS,
        type: "collab",
        members: [MEMBER, CO_MEMBER],
        applied_metatasks: [
          aMetatask({ metatask_faction_slug: "snide" }),
        ],
      },
    });
    const { text } = render(collab);
    for (const neutral of [
      "Proof",
      "Members",
      "Metatasks",
      "Cast your vote",
      "Who voted",
    ]) {
      expect(text, `the shared word for ${neutral}`).toContain(neutral);
    }

    // Recorded on #1119, not built.
    for (const voiced of [
      "Receipts",
      "Posted together by",
      "Extras taken",
      "Your call",
      "Who called it",
    ]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced);
    }
  });

  it("leaves moderation and system chrome in the shared neutral words", () => {
    // #1118: moderation chrome sits outside the costume.
    const flagged = state({ praxis: { ...PRAXIS, moderation_status: "flagged" } });
    expect(render(flagged).text, "the shared flagged banner").toContain("FLAGGED");
    expect(render(flagged).text).not.toContain("Pulled for review");

    const failed = state({
      praxis: {
        ...PRAXIS,
        moderation_status: "failed",
        admin_note: "The photo is of a different ridge.",
      },
    });
    const failedText = render(failed).text;
    expect(failedText, "the shared failed banner").toContain(
      "This praxis was marked as failed.",
    );
    expect(failedText, "with the steward's note as its body").toContain(
      "The photo is of a different ridge.",
    );
    expect(failedText).not.toContain("Kicked back");

    const steward = render(state({ showAdminBar: true })).text;
    expect(steward, "the shared steward bar").toContain("ADMIN");
    expect(steward).not.toContain("Ratchet");
  });

  it("mounts the report card bare, in the shared neutral chrome", () => {
    // ADR-0061: not wrapped in the costume.
    const { html, text } = render(state());
    expect(text, "the neutral card").toContain("Flag this praxis");
    expect(html, "on its own neutral chrome class").toContain("sidebar-card");
  });
});

describe("S.N.I.D.E. praxis detail — the dress traps", () => {
  it("keeps the ransom headline one readable string", () => {
    // A flex row would drop the whitespace-only children and read "TheLongWayRound".
    expect(render(state()).text).toContain("The Long Way Round");
  });

  it("restyles the write-up, never redacts it", () => {
    // #1023: the censor is a rule, not a strike over player text.
    expect(render(state()).text).toContain("Walked the whole ridge before dark.");
  });

  it("heads sections with the censor rule and closes no box with it", () => {
    // #1285: the rule is a section-head ornament, never a box footer.
    const { html } = render(state());
    // One per head on the WALL (proof, write-up, discussion); heads inside a
    // slab take the ACID rule, since censor ink is invisible on black.
    expect(html.split("snd-censor").length - 1).toBe(3);
    // Pin the shape: the first rule after the body trails the next head's label.
    const body = "Walked the whole ridge before dark.";
    const afterBody = html.slice(html.indexOf(body) + body.length);
    expect(afterBody.indexOf("snd-censor")).toBeGreaterThan(
      afterBody.indexOf("Who voted"),
    );
  });

  it("mounts ONE score readout and invents no arithmetic", () => {
    const { text } = render(state());
    expect(text, "base").toContain("12");
    expect(text, "total from the shared resolver").toContain("16");
    // Matched with its figure: the who-voted head's "2 votes" is a head count.
    expect(
      text.match(/votes \+\d/g)?.length,
      "the stamp carries the tally; the page does not restate it",
    ).toBe(1);
  });

  it("draws the duel card on a settled duel and nothing on a declined one", () => {
    const settled = render(state({ duel: duel() })).text;
    expect(settled, "the neutral card label").toContain("The duel");
    expect(settled, "the live margin, not a decided verdict").toContain("leads by");
    expect(settled, "no stakes copy near it — the loss modifier is 0.0").not.toContain(
      "at least",
    );

    expect(render(state({ duel: duel({ status: "declined" }) })).text).not.toContain(
      "The duel",
    );
    expect(render(state()).text, "and nothing without a duel").not.toContain("The duel");
  });
});

describe("S.N.I.D.E. praxis detail — the state axes", () => {
  it("credits every co-author and shows the crew only on a collab", () => {
    const solo = render(state());
    expect(solo.html, "solo links one poster").toContain('href="/characters/3"');
    expect(solo.text, "and draws no members section").not.toContain("Members");

    const collab = state({
      praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] },
    });
    const { html, text } = render(collab);
    expect(html, "each co-author is reachable").toContain('href="/characters/4"');
    expect(text).toContain("Beth");
    expect(text, "the crew reads as Members, the domain noun").toContain("Members");
  });

  it("shows owner controls to a member and nothing to a visitor", () => {
    // #1397: on a submitted solo `/edit` redirects back here, so unsubmit is the
    // way into the composer.
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

  it("draws the read-only seal stack, with no add chip", () => {
    // `apply_metatask` requires `in_progress`, so an add chip would 422 on tap.
    expect(render(state()).text).not.toContain("Add a metatask");
  });
});
