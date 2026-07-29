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
 *  - the ADR-0061 amendment's voice boundary — the content slots speak
 *    S.N.I.D.E., the moderation and system chrome does not;
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
import "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";
import type { DuelDetailOut, DuelSideOut } from "../../../api/duel";
import type { CurrentUser } from "../../../api/auth";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetype picks it up.
const { default: SnidePraxisDetail } = await import("../archetypes/SnidePraxisDetail");

const MEMBER: PraxisMemberOut = {
  id: 101,
  praxis_id: 1,
  character_id: 3,
  character_display_name: "Ada",
  has_submitted: true,
  joined_at: "2026-01-01T00:00:00Z",
};

const CO_MEMBER: PraxisMemberOut = {
  id: 102,
  praxis_id: 1,
  character_id: 4,
  character_display_name: "Beth",
  has_submitted: true,
  joined_at: "2026-01-02T00:00:00Z",
};

const PRAXIS: PraxisOut = {
  id: 1,
  task_id: 7,
  task_title: "A Chore Nobody Logged",
  task_point_value: 12,
  task_level_required: 2,
  task_faction_slug: "snide",
  type: "solo",
  status: "submitted",
  title: "The Long Way Round",
  body_text: "Walked the whole ridge before dark.",
  moderation_status: "visible",
  admin_note: null,
  flagged_at: null,
  submitted_at: "2026-01-03T00:00:00Z",
  submit_proposed_at: null,
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "snide",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-03T00:00:00Z",
  members: [MEMBER],
  invites: [],
  media_items: [
    {
      id: 9,
      praxis_id: 1,
      type: "image",
      file_path: "proof.png",
      display_order: 0,
      created_at: "2026-01-03T00:00:00Z",
    },
  ],
  // (base 12 + meta 0) × 1.0 + 4 from votes.
  score: 16,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 4,
  is_top_for_task: false,
  duel_id: null,
  can_flag: true,
  applied_metatasks: [],
};

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
};

const RIVAL: DuelSideOut = {
  praxis_id: 2,
  character_id: 4,
  display_name: "Rax",
  faction_slug: "coven",
  avatar_url: "",
  points_from_votes: 15.4,
  is_submitted: true,
};

function duel(overrides: Partial<DuelDetailOut> = {}): DuelDetailOut {
  return {
    id: 5,
    task_id: 7,
    status: "settled",
    forfeited_by_character_id: null,
    challenger: MINE,
    opponent: RIVAL,
    viewer_is_participant: false,
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
    votes: { praxis_id: 1, total_votes: 2, total_score: 4 },
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
  it("draws the breadcrumb on desktop and the back link on mobile", () => {
    const wide = render(state());
    expect(wide.html, "breadcrumb links to the task bank").toContain('href="/tasks"');
    expect(wide.html, "breadcrumb links to the task").toContain('href="/tasks/7"');
    expect(wide.html, "no phone back link on desktop").not.toContain('href="/praxes"');

    const phone = render(state(), "mobile");
    expect(phone.html, "phone back link to the praxis index").toContain('href="/praxes"');
    expect(phone.text, "and its label").toContain("Praxes");
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
    expect(indexOf(wide.html, "Receipts"), "proof precedes the aside rail").toBeLessThan(
      indexOf(wide.html, "Score"),
    );

    const phone = render(state(), "mobile");
    expect(phone.text.match(/Score/g)?.length, "one score block on mobile").toBe(1);
    expect(indexOf(phone.html, "Score"), "the rail rides above the proof").toBeLessThan(
      indexOf(phone.html, "Receipts"),
    );
  });

  it("shows the crown at BOTH form factors on a crowned praxis", () => {
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned, "desktop").text, "crown on desktop").toContain("TASK CROWN");
    expect(render(crowned, "mobile").text, "crown on mobile too").toContain("TASK CROWN");
    expect(render(state(), "mobile").text, "and only when crowned").not.toContain(
      "TASK CROWN",
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

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background must still show around
    // the page. `.snide-backdrop` is the `position: fixed` mount of the same
    // wall paint and must NOT be the one used here.
    const { html } = render(state());
    expect(html, "the column's own wall").toContain("snd-detail-sheet");
    expect(html, "not the full-viewport mount").not.toContain("snide-backdrop");
  });
});

describe("S.N.I.D.E. praxis detail — the voice boundary (ADR-0061 as amended)", () => {
  it("speaks S.N.I.D.E. in the content slots", () => {
    const collab = state({
      praxis: {
        ...PRAXIS,
        type: "collab",
        members: [MEMBER, CO_MEMBER],
        applied_metatasks: [
          {
            id: 501,
            title: "Composting",
            description: null,
            point_value: 60,
            level_required: 0,
            status: "active",
            task_type: "metatask",
            created_by: 9,
            primary_faction_slug: null,
            metatask_faction_slug: "snide",
            is_task_vision_eligible: false,
            created_at: "2026-01-01T00:00:00Z",
            can_submit_praxis: false,
            allowed_modes: [],
            eligible_for_current_user: false,
          },
        ],
      },
    });
    const { text } = render(collab);
    expect(text, "media").toContain("Receipts");
    expect(text, "crew").toContain("Posted together by");
    expect(text, "metatasks").toContain("Extras taken");
    expect(text, "vote").toContain("Your call");
    expect(text, "voters").toContain("Who called it");

    // The shared neutral words those five replace must be gone from this page.
    expect(text, "not the neutral proof heading").not.toContain("Proof");
    expect(text, "not the neutral members heading").not.toContain("Members");
    expect(text, "not the neutral vote heading").not.toContain("Cast your vote");
    expect(text, "not the neutral voters heading").not.toContain("Who voted");
  });

  it("leaves moderation and system chrome in the shared neutral words", () => {
    // The design voices these three; the owner's caveat on #1118 rules that
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

  it("mounts ONE score readout and invents no arithmetic", () => {
    const { text } = render(state());
    expect(text, "base").toContain("12");
    expect(text, "total from the shared resolver").toContain("16.0");
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
    expect(solo.text, "and draws no crew section").not.toContain("Posted together by");

    const collab = state({
      praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] },
    });
    const { html, text } = render(collab);
    expect(html, "each co-author is reachable").toContain('href="/characters/4"');
    expect(text).toContain("Beth");
  });

  it("shows owner controls to a member and nothing to a visitor", () => {
    expect(render(state()).html, "a visitor gets no edit link").not.toContain(
      'href="/praxes/1/edit"',
    );
    const owner = state({ isOwner: true, user: VIEWER });
    expect(render(owner).html).toContain('href="/praxes/1/edit"');
  });

  it("lists who voted and each voter's own rung, never an average", () => {
    const { html, text } = render(state());
    expect(text).toContain("Who called it");
    expect(html).toContain('href="/characters/11"');
    expect(text, "the count, not the mean").toContain("2 votes");

    expect(render(state({ voters: [] })).text, "no empty voter panel").not.toContain(
      "Who called it",
    );
  });

  it("draws the read-only seal stack, with no add chip", () => {
    // `apply_metatask` requires `in_progress`, so an add chip would 422 on tap.
    expect(render(state()).text).not.toContain("Add a metatask");
  });
});
