/**
 * Praxis detail v2 — the Unaffiliated page's own contract (#1088, ADR-0061).
 *
 * `archetypeSlots.test.tsx` guards the slots EVERY praxis-detail archetype must
 * emit. This file guards what is specific to the rebuilt Unaffiliated page: the
 * layout contract (breadcrumb / grid / comments region), the responsive move of
 * the score block, and that each state axis the issue lists actually renders.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (see
 * SPEC-testing.md). `useFormFactor` is therefore MOCKED rather than driven off
 * `matchMedia` — the mobile assertions are about the form factor reaching the
 * page, not about a real viewport. Light vs dark is a pure `[data-theme]` CSS
 * cascade with no branch in this component, so there is nothing here to assert
 * about it; it is an eyeball check.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";
import type { DuelDetailOut } from "../../../api/duel";
import type { CurrentUser } from "../../../api/auth";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetype picks it up.
const { default: DefaultPraxisDetail } = await import("../archetypes/DefaultPraxisDetail");

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
  task_faction_slug: null,
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
  created_by_faction_slug: null,
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
    faction_slug: null,
    level: 4,
    points: 120,
    avatar_url: null,
  },
} as unknown as CurrentUser;

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
    handleResubmit: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
    metatasks: [],
    metataskLoading: false,
    metataskError: null,
    applyingMetataskId: null,
    removingMetataskId: null,
    handleApplyMetatask: async () => {},
    handleRemoveMetatask: async () => {},
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
      <DefaultPraxisDetail state={next} />
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

describe("Unaffiliated praxis detail — layout contract", () => {
  it("draws the breadcrumb on desktop and the back link on mobile", () => {
    const wide = render(state());
    expect(wide.html, "breadcrumb links to the task bank").toContain('href="/tasks"');
    expect(wide.html, "breadcrumb links to the task").toContain('href="/tasks/7"');
    expect(wide.html, "no phone back link on desktop").not.toContain('href="/praxes"');

    const phone = render(state(), "mobile");
    expect(phone.html, "phone back link to the praxis index").toContain('href="/praxes"');
    expect(phone.text, "and its label").toContain("Praxes");
    expect(phone.text, "centred page label").toContain("Praxis");
  });

  it("moves the score block above the proof on mobile and into the aside on desktop", () => {
    // The score heading and the proof heading are the two anchors; only their
    // ORDER changes, and each renders exactly once at both form factors.
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

  it("carries its ground on the column, never the viewport", () => {
    // WORLD_ZERO_STYLE §5 / #1028: the site background must still show around
    // the page. `.na-backdrop` is `position: fixed; inset: 0`.
    expect(render(state()).html).not.toContain("na-backdrop");
  });

  it("mounts the comments region with the layout's heading, not the thread's", () => {
    const { text } = render(state());
    expect(text, "the layout's section head").toContain("Discussion");
    expect(text, "and not a second heading for the same list").not.toContain("0 comments");
  });

  it("hides the comment region on a praxis that is not visible", () => {
    const hidden = state({ praxis: { ...PRAXIS, moderation_status: "hidden" } });
    expect(render(hidden).text).not.toContain("Discussion");
  });
});

describe("Unaffiliated praxis detail — the state axes", () => {
  it("renders the score readout from the shared resolver", () => {
    const { text } = render(state());
    expect(text, "base").toContain("12");
    expect(text, "points from votes").toContain("4");
    expect(text, "total").toContain("16.0");
  });

  it("shows the multiplier row only when the factor is not 1.0", () => {
    expect(render(state()).text, "neutral era hides it").not.toContain("Multiplier");
    const boosted = state({
      praxis: { ...PRAXIS, display_multiplier: 1.1, score: 17.2 },
    });
    const { text } = render(boosted);
    expect(text).toContain("Multiplier");
    expect(text).toContain("×1.10");
  });

  it("names the metatask contribution only when one is applied", () => {
    expect(render(state()).text).not.toContain("Metatasks");
    const sealed = state({
      praxis: { ...PRAXIS, metatask_points: 5, score: 21 },
    });
    expect(render(sealed).text).toContain("Metatasks");
  });

  it("banners flagged, failed-with-note, and the crown", () => {
    expect(render(state()).text, "clean praxis has no banner").not.toContain("FLAGGED");

    const flagged = state({ praxis: { ...PRAXIS, moderation_status: "flagged" } });
    expect(render(flagged).text).toContain("FLAGGED");

    const failed = state({
      praxis: {
        ...PRAXIS,
        moderation_status: "failed",
        admin_note: "The photo is of a different ridge.",
      },
    });
    expect(render(failed).text, "the admin note is the banner's body").toContain(
      "The photo is of a different ridge.",
    );

    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned).text).toContain("TASK CROWN");
    expect(render(state()).text).not.toContain("TASK CROWN");
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
    expect(text, "the crew reads as Members, the domain noun").toContain("Members");
  });

  it("shows owner controls to a member and nothing to a visitor", () => {
    expect(render(state()).html, "a visitor gets no edit link").not.toContain(
      'href="/praxes/1/edit"',
    );
    const owner = state({ isOwner: true, user: VIEWER });
    expect(render(owner).html).toContain('href="/praxes/1/edit"');
  });

  it("shows the steward bar only in admin mode", () => {
    expect(render(state()).text).not.toContain("ADMIN");
    const steward = state({ showAdminBar: true });
    expect(render(steward).text).toContain("ADMIN");
  });

  it("lists who voted and each voter's own rung, never an average", () => {
    const { html, text } = render(state());
    expect(text).toContain("Who voted");
    expect(html).toContain('href="/characters/11"');
    expect(text, "the count, not the mean").toContain("2 votes");

    const unvoted = state({ voters: [] });
    expect(render(unvoted).text, "no empty voter panel").not.toContain("Who voted");
  });
});
