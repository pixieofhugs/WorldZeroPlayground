/**
 * S.N.I.D.E. praxis detail — the skin's own contract (#1118, epic #1085).
 *
 * `archetypeSlots.test.tsx` already walks the registry and guards the slots
 * EVERY praxis-detail archetype must emit, and it picks this skin up the moment
 * the manifest line lands. This file guards what is specific to dressing the
 * shared layout as S.N.I.D.E.:
 *
 *  - the layout contract it inherits and must not re-derive (330px aside, the
 *    responsive move of the rail, the crown at both form factors, one comments
 *    heading);
 *  - ADR-0061's copy rule — the page speaks entirely in the shared neutral
 *    words, and the S.N.I.D.E. vocabulary the design names is recorded on
 *    #1119 rather than built;
 *  - and the two S.N.I.D.E.-specific traps: the ransom headline that must stay
 *    one readable string, and the ground that belongs to the column.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md), so
 * `useFormFactor` is MOCKED rather than driven off a viewport. Light vs dark is
 * a pure `[data-theme]` cascade with no branch in this component, so there is
 * nothing here to assert about it — it is an eyeball check.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { DuelDetailOut, DuelSideOut } from "../../../api/duel";
import type { CurrentUser } from "../../../api/auth";
import { aMember, aPraxis } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetype picks it up.
const { default: SnidePraxisDetail } = await import("../archetypes/SnidePraxisDetail");

const MEMBER = aMember({
  character_id: 3,
  character_display_name: "Ada",
});

const CO_MEMBER = aMember({
  id: 102,
  character_id: 4,
  character_display_name: "Beth",
  joined_at: "2026-01-02T00:00:00Z",
});

const PRAXIS = aPraxis({
  task_title: "A Chore Nobody Logged",
  task_faction_slug: "snide",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "snide",
  members: [MEMBER],
});

const VIEWER: CurrentUser = {
  id: 50,
  email: "ada@example.com",
  display_name: "Ada",
  is_admin: false,
  can_comment: true,
  character: {
    id: 3,
    display_name: "Ada",
    faction_slug: "snide",
    level: 4,
    points: 120,
    avatar_url: null,
  },
} as unknown as CurrentUser;

const MINE: DuelSideOut = {
  praxis_id: 1,
  character_id: 3,
  display_name: "Ada",
  faction_slug: "snide",
  avatar_url: "",
  points_from_votes: 18,
  is_submitted: true,
  nudged_at: null,
};

const RIVAL: DuelSideOut = {
  praxis_id: 2,
  character_id: 4,
  display_name: "Rax",
  faction_slug: "coven",
  avatar_url: "",
  points_from_votes: 15.4,
  is_submitted: true,
  nudged_at: null,
};

function duel(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status: "settled",
    forfeited_by_character_id: null,
    challenger: MINE,
    opponent: RIVAL,
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
    ...overrides,
  };
}

function state(overrides: Partial<PraxisDetailState> = {}): PraxisDetailState {
  return {
    loading: false,
    praxis: PRAXIS,
    fetchError: null,
    comments: null,
    voters: [
      { character_id: 11, display_name: "Cy", avatar_url: "", faction_slug: "", value: 5 },
      { character_id: 12, display_name: "Dov", avatar_url: "", faction_slug: "", value: 3 },
    ],
    duel: null as DuelDetailOut | null,
    isOwner: false,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: "",
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: "",
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
    ...overrides,
  };
}

function render(
  next: PraxisDetailState,
  formFactor: "desktop" | "mobile" = "desktop",
): { html: string; text: string } {
  mocks.formFactor = formFactor;
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <SnidePraxisDetail state={next} />
    </MemoryRouter>,
  );
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

/** Where a marker sits in the markup — the seam the responsive move is about. */
function indexOf(html: string, needle: string): number {
  const at = html.indexOf(needle);
  expect(at, `marker missing: ${needle}`).toBeGreaterThan(-1);
  return at;
}

describe("S.N.I.D.E. praxis detail — the inherited layout contract", () => {
  it("draws no navigation of its own, at either width (#2102)", () => {
    // It drew a bespoke trail on desktop and swapped it for a back link to
    // /praxis on mobile. Both are gone: the breadcrumb is neutral site chrome
    // now, drawn once above this column by `components/nav/Breadcrumb`, and what
    // the trail CONTAINS is pinned in `pages/__tests__/breadcrumbAcrossSurfaces`
    // for every skin at both widths. What is left to say here is the negative.
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
    // The page carried TWO grounds: the flipping xerox clipping
    // (`--faction-snide-note-paper`) and the theme-invariant black plate. The
    // owner collapsed them to one — the plate — so no ink that flips can land
    // on a sheet any more, and `.snd-censor` (photocopier ink, invisible ON the
    // plate) can no longer rule a head that sits on one.
    const { html } = render(state());
    expect(html, "the stock has no consumer left on this page").not.toContain(
      "--faction-snide-note-paper",
    );
    expect(html, "one ground, and it is the plate").toContain("--faction-snide-card-bg");
    // The censor half of the same ruling is counted by "heads sections with the
    // censor rule" below, which is where the shape assertion already lives.
  });

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background must still show around
    // the page. `.snide-backdrop` is the `position: fixed` mount of the same
    // wall paint and must NOT be the one used here.
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
          {
            id: 501,
            title: "Composting",
            description: '',
            point_value: 60,
            level_required: 0,
            status: "active",
            task_type: "metatask",
            created_by: 9,
            primary_faction_slug: 'na',
            metatask_faction_slug: "snide",
            created_at: "2026-01-01T00:00:00Z",
            in_progress_count: 0,
            created_by_display_name: "",
            created_by_avatar_url: "",
            created_by_faction_slug: null,
            created_by_level: 0,
            signup_reason: null,
            in_progress_praxis_id: null,
            submitted_praxis_id: null,
            can_sign_up: false,
            allowed_modes: [],
            eligible_for_current_user: false,
            start_here: false,
          },
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

    // The five words this skin shipped for a day (#1159) and gave back when the
    // amendment that allowed them was withdrawn. They live on #1119 now.
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
    // The design voices these three too; the owner's caveat on #1118 rules that
    // moderation chrome sits outside the costume. "Pulled for review" / "Kicked
    // back" / "Ratchet" are dress notes, not authority.
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
    // ADR-0061: `PraxisFlagBlock` takes `state` and nothing else, and this page
    // must not wrap it in the costume — no clipping stock, no black plate.
    const { html, text } = render(state());
    expect(text, "the neutral card").toContain("Flag this praxis");
    expect(html, "on its own neutral chrome class").toContain("sidebar-card");
  });
});

describe("S.N.I.D.E. praxis detail — the dress traps", () => {
  it("keeps the ransom headline one readable string", () => {
    // The cut-up headline slices a title word by word across four faces. A flex
    // row would discard the whitespace-only children between them and render
    // "TheLongWayRound"; ordinary inline flow with REAL spaces does not.
    expect(render(state()).text).toContain("The Long Way Round");
  });

  it("restyles the write-up, never redacts it", () => {
    // #1023's ruling, restated: the censor is a rule, not a strike over a
    // string the player wrote.
    expect(render(state()).text).toContain("Walked the whole ridge before dark.");
  });

  it("heads sections with the censor rule and closes no box with it", () => {
    // #1285, the praxis twin of #1145. The rule is a section-head ornament: it
    // runs out of a slab headline and separates the head from what follows. A
    // fifth used to hang off the FOOT of the write-up panel on `marginTop`,
    // where it separated the last line of the body from the box's own edge a
    // few pixels down — i.e. from nothing.
    const { html } = render(state());
    // One rule per section head that sits on the WALL, on a solo, visible
    // praxis: proof, write-up, discussion. A head INSIDE a slab takes the broken
    // ACID rule instead — the censor's blocks are photocopier ink and are
    // invisible on black — which is a different ornament and deliberately not
    // counted here. It was FOUR until #2066: the who-voted head moved onto the
    // slab with its section when the clipping and the plate became one ground.
    expect(html.split("snd-censor").length - 1).toBe(3);
    // …and the count alone can be rebalanced. Pin the SHAPE too: the first rule
    // after the body text must belong to the next section's head, so it has to
    // trail that heading's label rather than sit between the body and the edge.
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
    expect(
      text.match(/from votes/g)?.length,
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

  it("draws the read-only seal stack, with no add chip", () => {
    // `apply_metatask` requires `in_progress`, so an add chip would 422 on tap.
    expect(render(state()).text).not.toContain("Add a metatask");
  });
});
