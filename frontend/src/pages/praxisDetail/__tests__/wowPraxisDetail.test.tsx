/**
 * WOW praxis detail — THE CHRONICLE ENTRY (#1121).
 *
 * `archetypeSlots.test.tsx` already walks this archetype for the content slots
 * every praxis-detail skin must emit (finding, task link, byline, crown, seal,
 * score breakdown), so none of that is repeated here. What is left is what only
 * WOW can get wrong:
 *
 *  - the registry row that makes the page reachable at all — one of #951's four
 *    bullets was that WOW *rendered the generic Default here*, and a green
 *    render proves nothing about which component produced it;
 *  - ADR-0061's copy rule: every word on the page is the shared neutral one,
 *    including the six slots the design names — WOW's chronicle vocabulary is
 *    recorded on #1121 and deliberately not built;
 *  - the layout facts #1129 reconciled against the eight faction designs — the
 *    330px aside, the crown at BOTH form factors, the undressed report card;
 *  - the dress itself, which is the only thing a skin is allowed to bring.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md).
 * `useFormFactor` is MOCKED rather than driven off `matchMedia` — the mobile
 * assertions are about the form factor reaching the page. Light vs dark is a
 * pure `[data-theme]` cascade with no branch in the component, so there is
 * nothing here to assert about it; it is an eyeball check.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { DuelDetailOut } from "../../../api/duel";
import type { CurrentUser } from "../../../api/auth";
import { aMember, aPraxis } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetype picks it up.
const { default: WowPraxisDetail } = await import("../archetypes/WowPraxisDetail");
const { default: DefaultPraxisDetail } = await import("../archetypes/DefaultPraxisDetail");

const MEMBER = aMember({
  character_id: 3,
  character_display_name: "Wren Abalone",
});

const CO_MEMBER = aMember({
  id: 102,
  character_id: 4,
  character_display_name: "Bram Quilling",
  joined_at: "2026-01-02T00:00:00Z",
});

// No apostrophes in the fixtures: `renderToStaticMarkup` escapes them to
// `&#x27;`, which survives the tag-strip and breaks a plain substring check.
const PRAXIS = aPraxis({
  task_title: "Hauled the recycling to the depot",
  task_faction_slug: "wow",
  created_by_id: 3,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "wow",
  members: [MEMBER],
});

const VIEWER: CurrentUser = {
  id: 50,
  display_name: "Wren Abalone",
  is_admin: false,
  character: {
    id: 3,
    display_name: "Wren Abalone",
    faction_slug: "wow",
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

/** A two-sided duel at a given status; this praxis is the challenger's. */
function duel(status: DuelDetailOut["status"]): DuelDetailOut {
  const side = (praxisId: number | null, id: number, name: string, votes: number) => ({
    praxis_id: praxisId,
    character_id: id,
    display_name: name,
    faction_slug: "wow",
    avatar_url: "",
    points_from_votes: votes,
    habit_bonus_points: 0,
    is_submitted: true,
    nudged_at: null,
  });
  return {
    id: 5,
    task_id: 7,
    status,
    forfeited_by_character_id: null,
    challenger: side(1, 3, "Wren Abalone", 18),
    opponent: side(2, 4, "Bram Quilling", 15.4),
    winner_character_id: null,
    challenger_final_points: null,
    opponent_final_points: null,
  };
}

function render(
  next: PraxisDetailState,
  formFactor: "desktop" | "mobile" = "desktop",
): { html: string; text: string } {
  mocks.formFactor = formFactor;
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <WowPraxisDetail state={next} />
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

describe("WOW claims the praxis-detail surface (#951)", () => {
  it("registers a praxisDetail archetype", () => {
    expect(surfaceMap("praxisDetail")["wow"]).toBeDefined();
  });

  it("is the WOW skin and not the na fallback still wearing its name", () => {
    // The bug this closes was invisible: WOW *rendered*, it just rendered the
    // generic Default. Two different components, so the tell is the dress.
    const wow = render(state());
    const na = renderToStaticMarkup(
      <MemoryRouter>
        <DefaultPraxisDetail state={state()} />
      </MemoryRouter>,
    );
    expect(wow.html, "the parchment field").toContain("wow-detail-field");
    expect(na, "which the na page has no notion of").not.toContain("wow-detail-field");
    expect(na, "na's page is the spectrum").toContain("--faction-default-rainbow");
  });

  it("resolves through the manifest thunk to the same component", async () => {
    const Resolved = await resolvedArchetype(surfaceMap("praxisDetail")["wow"]);
    expect(Resolved).toBe(WowPraxisDetail);
  });
});

describe("WOW praxis detail — copy is neutral (ADR-0061)", () => {
  it("reads the shared neutral words in every content slot", () => {
    const { text } = render(
      state({
        praxis: {
          ...PRAXIS,
          // A two-member praxis is a COLLAB. The fixture left `type` at the
          // base `solo` and leaned on the old count proxy; the Members
          // section is gated on the type now (#1274).
          type: "collab",
          members: [MEMBER, CO_MEMBER],
          applied_metatasks: [
            {
              id: 501,
              title: "Composting",
              description: '',
              point_value: 6,
              level_required: 0,
              status: "active",
              task_type: "metatask",
              created_by: 9,
              primary_faction_slug: 'na',
              metatask_faction_slug: "wow",
              created_at: "2026-01-01T00:00:00Z",
              in_progress_count: 0,
              created_by_display_name: "",
              created_by_avatar_url: "",
              created_by_faction_slug: null,
              created_by_level: 0,
              signup_reason: null,
              in_progress_praxis_id: null,
              can_sign_up: false,
              allowed_modes: [],
              eligible_for_current_user: false,
              start_here: false,
            },
          ],
        },
      }),
    );
    for (const neutral of [
      "Proof",
      "Members",
      "Metatasks",
      "Cast your vote",
      "Who voted",
      "Discussion",
    ]) {
      expect(text, `the shared word for ${neutral}`).toContain(neutral);
    }

    // The six words this skin shipped for a day (#1160) and gave back when the
    // amendment that allowed them was withdrawn. They live on #1121 now.
    for (const voiced of [
      "The proof",
      "Sworn together by",
      "Charms claimed",
      "Your cheer",
      "The court says",
      "The gallery",
    ]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced);
    }
  });

  it("keeps the moderation chrome in the shared neutral words", () => {
    const flagged = render(
      state({ praxis: { ...PRAXIS, moderation_status: "flagged" }, showAdminBar: true }),
    );
    expect(flagged.text, "the shared flagged banner").toContain("FLAGGED");
    expect(flagged.text, "and its shared sentence").toContain("awaiting admin review");
    expect(flagged.text, "the shared steward bar").toContain("ADMIN");

    const failed = render(
      state({
        praxis: {
          ...PRAXIS,
          moderation_status: "failed",
          admin_note: "Proof shows a different depot.",
        },
      }),
    );
    expect(failed.text, "the shared failure notice").toContain("marked as failed");
    expect(failed.text, "with the steward note").toContain("different depot");
  });

  it("leaves the report card outside the costume", () => {
    // `PraxisFlagBlock` takes `state` and nothing else — there is no seam to
    // dress it through — so the guard is that the neutral card is present and
    // wearing neutral tokens, not WOW plate chrome.
    const { html } = render(state());
    // Bounded at the aside's close — the flag card is its last child, so an
    // unbounded slice would swallow the comments region and its dress.
    const card = html.slice(indexOf(html, "sidebar-card"), indexOf(html, "</aside>"));
    expect(card, "the report card is bare").not.toContain("--faction-wow");
    expect(html, "and reads the shared words").toContain("Flag this praxis");
  });
});

describe("WOW praxis detail — the layout contract (#1129)", () => {
  it("holds the 330px aside on desktop and drops the track on mobile", () => {
    expect(render(state()).html, "the corrected track, not 340").toContain("330px");
    expect(render(state(), "mobile").html, "no aside track on a phone").not.toContain("330px");
  });

  it("shows the crown at BOTH form factors", () => {
    // The mark is the score stamp's corner fleur now — #1710 retired the
    // hero banner. The score block is in both layouts, so it is still never
    // form-factor gated, and it is still the one canonical `TaskCrown`.
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(crowned).html, "desktop").toContain(crown);
    expect(render(crowned, "mobile").html, "mobile — never form-factor gated").toContain(
      crown,
    );
    expect(render(state(), "mobile").html, "and only when crowned").not.toContain(crown);
  });

  it("moves the score above the proof on mobile, and draws it exactly once", () => {
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
});

describe("WOW praxis detail — the dress", () => {
  it("wears the chronicle palette and all three faces", () => {
    const { html } = render(state());
    expect(html, "the parchment field").toContain("wow-detail-field");
    expect(html, "the gold frame").toContain("--faction-wow-chronicle-gold");
    expect(html, "MedievalSharp").toContain("--faction-wow-card-font");
    expect(html, "Lora italic").toContain("--faction-wow-body-font");
    // Caveat arrives as the shared SURFACE token, never Coven's card font (§4).
    expect(html, "Caveat, the marginal hand").toContain("--font-faction-script");
    expect(html, "not by repointing Coven").not.toContain("--faction-coven-card-font");
  });

  it("strings the bunting and bobs exactly one bunch of balloons", () => {
    const { html } = render(state());
    // The bunch is the page's one bobbing ornament, and its motion is
    // CLASS-gated, never inline.
    //
    // The bunting is asserted by its handle rather than by a pennant's plum
    // border: since #2728 the strip measures its container and draws as many
    // whole flags as fit, so with no DOM here it renders empty. The alternation
    // and the stagger are pinned at `factionMarks/__tests__/wowBunting.test.tsx`.
    expect(html, "bunting is strung").toContain("data-wow-bunting");
    expect(html.match(/wow-balloon-bunch/g)?.length, "one bunch, not a soup").toBe(1);
    expect(html, "motion is never inline").not.toContain("animation:");
  });

  it("carries no unaffiliated spectrum of its own", () => {
    // The na tell is `--faction-default-rainbow`. A WOW page that leaks one is
    // a Default that has not actually been replaced.
    expect(render(state()).html).not.toContain("--faction-default-rainbow");
  });
});

describe("WOW praxis detail — the state axes", () => {
  it("renders solo, collab and duel", () => {
    const solo = render(state());
    expect(solo.text, "no roster for a solo").not.toContain("Members");

    const collab = render(
      state({ praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] } }),
    );
    expect(collab.text, "both co-authors in the byline").toContain("Bram Quilling");
    expect(collab.text, "and the roster").toContain("Members");

    // A declined challenge draws NO card at all (ADR-0011) — the duel block
    // self-hides, and this page must not invent a line about it.
    const declined = render(
      state({
        praxis: { ...PRAXIS, type: "duel", duel_id: 5 },
        duel: duel("declined"),
      }),
    );
    expect(declined.text, "nothing about a duel that never happened").not.toContain("The duel");

    // A settled duel DOES draw one, wearing this page's plate chrome and its
    // section head rather than the card's own.
    const settled = render(
      state({
        praxis: { ...PRAXIS, type: "duel", duel_id: 5 },
        duel: duel("settled"),
      }),
    );
    expect(settled.text, "the duel card is mounted").toContain("The duel");
    expect(settled.text, "and reads the live standing, never a verdict").toContain("live");
  });

  it("renders as visitor, owner and steward", () => {
    // #1397: the cluster is anchored on the UNSUBMIT control now. On a
    // submitted solo `/edit` redirects straight back to this page, so the edit
    // link is hidden and unsubmitting is the way into the composer.
    expect(render(state()).text, "a visitor gets no owner controls").not.toContain(
      "unsubmit",
    );
    expect(
      render(state({ isOwner: true, user: VIEWER })).text,
      "the owner does",
    ).toContain("unsubmit");
    expect(
      render(state({ isOwner: true, user: VIEWER })).text,
      "and no link that would round-trip",
    ).not.toContain("edit this praxis");
    expect(
      render(state({ showAdminBar: true })).text,
      "a steward gets the bar",
    ).toContain("ADMIN");
  });
});
