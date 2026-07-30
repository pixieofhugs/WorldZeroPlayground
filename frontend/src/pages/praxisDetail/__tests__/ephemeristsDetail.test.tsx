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
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";
import type { DuelDetailOut } from "../../../api/duel";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetype picks it up.
const { default: EphemeristsPraxisDetail } = await import(
  "../archetypes/EphemeristsPraxisDetail"
);

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
  task_title: "The Sunk Causeway",
  task_point_value: 12,
  task_level_required: 2,
  task_faction_slug: "ephemerists",
  type: "solo",
  status: "submitted",
  title: "Low Water, Third Reading",
  body_text: "Walked the causeway at the ebb and marked the stones.",
  moderation_status: "visible",
  admin_note: null,
  flagged_at: null,
  submitted_at: "2026-01-03T00:00:00Z",
  submit_proposed_at: null,
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "ephemerists",
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

/** A settled duel this praxis is the challenger side of. */
const DUEL: DuelDetailOut = {
  id: 5,
  task_id: 7,
  status: "settled",
  forfeited_by_character_id: null,
  challenger: {
    praxis_id: 1,
    character_id: 3,
    display_name: "Ada",
    faction_slug: "ephemerists",
    avatar_url: "",
    points_from_votes: 18,
    is_submitted: true,
  },
  opponent: {
    praxis_id: 2,
    character_id: 4,
    display_name: "Rax",
    faction_slug: "snide",
    avatar_url: "",
    points_from_votes: 15.4,
    is_submitted: true,
  },
  viewer_is_participant: false,
  winner_character_id: null,
  challenger_final_points: null,
  opponent_final_points: null,
};

function state(overrides: Partial<PraxisDetailState> = {}): PraxisDetailState {
  return {
    loading: false,
    praxis: PRAXIS,
    fetchError: null,
    comments: null,
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
      <EphemeristsPraxisDetail state={next} />
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
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned, "desktop").text, "crown on desktop").toContain("TASK CROWN");
    expect(render(crowned, "mobile").text, "crown on mobile too").toContain("TASK CROWN");
    expect(render(state(), "mobile").text, "and only when crowned").not.toContain(
      "TASK CROWN",
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
    expect(render(state()).html, "visitor gets no owner controls").not.toContain(
      "/praxis/1/edit",
    );
    const owner = render(state({ isOwner: true }));
    expect(owner.html, "the shared invariant controls").toContain("/praxis/1/edit");
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
    expect(text, "total").toContain("16.0");
  });

  it("reads each vote back in the faction's own tier word and numeral", () => {
    const { text } = render(state());
    // `reframeLabel` + `toRoman`, both already shipped — no invented copy.
    // The metals ladder (#1207) renamed the tiers; the page reads whatever
    // `reframeLabel` says, which is the point of asserting through it.
    expect(text, "the tier for 5").toContain("platinum");
    expect(text, "the tier for 3").toContain("silver");
    expect(text, "roman numerals, as VOTE_REFRAMES declares").toContain("V");
    expect(text, "and III for the second voter").toContain("III");
  });

  it("credits every co-author and shows the members section on a collab", () => {
    const solo = render(state());
    expect(solo.html, "solo links one author").toContain('href="/characters/3"');
    expect(solo.text, "and draws no members section").not.toContain("Members");

    const collab = render(state({ praxis: { ...PRAXIS, members: [MEMBER, CO_MEMBER] } }));
    expect(collab.html, "both co-authors are linked").toContain('href="/characters/4"');
    expect(collab.text, "and the members section renders").toContain("Members");
  });

  it("draws the proof and the write-up only when there is something to draw", () => {
    const bare = render(state({ praxis: { ...PRAXIS, media_items: [], body_text: "" } }));
    expect(bare.text).not.toContain("Proof");
    expect(bare.text).not.toContain("Write-up");
  });
});
