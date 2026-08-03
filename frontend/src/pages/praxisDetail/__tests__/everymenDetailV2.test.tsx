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
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { PraxisOut, PraxisMemberOut } from "../../../api/praxis";
import type { TaskOut } from "../../../api/tasks";
import type { DuelDetailOut } from "../../../api/duel";
import type { CurrentUser } from "../../../api/auth";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetype picks it up.
const { default: EverymenPraxisDetail } = await import(
  "../archetypes/EverymenPraxisDetail"
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

const METATASK: TaskOut = {
  id: 501,
  title: "Composting",
  description: '',
  point_value: 60,
  level_required: 0,
  status: "active",
  task_type: "metatask",
  created_by: 9,
  primary_faction_slug: 'na',
  metatask_faction_slug: "everymen",
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 0,
  created_by_display_name: "",
  created_by_avatar_url: "",
  created_by_faction_slug: null,
  created_by_level: 0,
  signup_reason: null,
  can_sign_up: false,
  allowed_modes: [],
  eligible_for_current_user: false,
};

const PRAXIS: PraxisOut = {
  id: 1,
  task_id: 7,
  task_title: "Sweep The Long Corridor",
  task_point_value: 12,
  task_level_required: 2,
  task_faction_slug: "everymen",
  type: "solo",
  status: "submitted",
  title: "Filed On The Late Shift",
  body_text: "Swept it end to end before the whistle.",
  moderation_status: "visible",
  admin_note: null,
  flagged_at: null,
  submitted_at: "2026-01-03T00:00:00Z",
  submit_proposed_at: null,
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "everymen",
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
    faction_slug: "everymen",
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
      <EverymenPraxisDetail state={next} />
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
    // canonical mark from the shared banners, keyed only on `is_top_for_task`.
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned, "desktop").text, "crown on desktop").toContain("TASK CROWN");
    expect(render(crowned, "mobile").text, "crown on mobile too").toContain("TASK CROWN");
    expect(render(state(), "mobile").text, "and only when crowned").not.toContain(
      "TASK CROWN",
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
    expect(text, "total").toContain("16.0");
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
    // The words are `collabCopy`'s, which the Everymen already override for
    // every roster on the site — not copy this page mints.
    const { text } = render(collab);
    expect(text, "filed").toContain("signed off");
    expect(text, "not filed").toContain("still on the clock");
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
