/**
 * UA praxis detail — THE PRESSED LEAF (#1119), the last of the eight.
 *
 * `archetypeSlots.test.tsx` already walks this archetype for the content slots
 * every praxis-detail skin must emit (finding, task link, byline, crown, seal,
 * score breakdown), so none of that is repeated here. What is left is what only
 * UA can get wrong:
 *
 *  - the registry row that makes the page reachable at all — a green render
 *    proves nothing about WHICH component produced it, and "the faction skin is
 *    actually the na fallback wearing its name" is the exact bug #951 caught on
 *    two other surfaces;
 *  - ADR-0061's copy rule: every word is the shared neutral one, including the
 *    seven slots #1119 names. UA's vocabulary is recorded on the issue and
 *    deliberately not built — four skins shipped it and were stripped in #1165;
 *  - the layout facts #1129 reconciled against the eight faction designs — the
 *    330px aside, the crown at BOTH form factors, the undressed report card;
 *  - the dress, which is the only thing a skin brings — and, specifically, the
 *    two grounds that are NOT taste calls: the rail plate must be
 *    `--faction-ua-card-bg` because `UaScoreStamp`'s box and `UaVote`'s mandala
 *    were both measured against it, and no ink-family token may be used as a
 *    `background:` (#1155 found that at 1.05:1 in UA's collab roster).
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
import { resolveRoleReads } from "../../../test/sourceScan";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so the archetype picks it up.
const { default: UaPraxisDetail } = await import("../archetypes/UaPraxisDetail");
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
  task_title: "Sat with the mesa at first light",
  task_faction_slug: "ua",
  title: "Ninety Breaths",
  body_text: "Counted them, lost count twice, began again.",
  created_by_id: 3,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "ua",
  members: [MEMBER],
});

const VIEWER: CurrentUser = {
  id: 50,
  display_name: "Wren Abalone",
  is_admin: false,
  character: {
    id: 3,
    display_name: "Wren Abalone",
    faction_slug: "ua",
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
    faction_slug: "ua",
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
      <UaPraxisDetail state={next} />
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

describe("UA claims the praxis-detail surface (#1119)", () => {
  it("registers a praxisDetail archetype", () => {
    expect(surfaceMap("praxisDetail")["ua"]).toBeDefined();
  });

  it("is the UA skin and not the na fallback still wearing its name", () => {
    // Two different components, so the tell has to be the dress rather than a
    // green render.
    const ua = render(state());
    const na = renderToStaticMarkup(
      <MemoryRouter>
        <DefaultPraxisDetail state={state()} />
      </MemoryRouter>,
    );
    expect(ua.html, "the toothed leaf").toContain("ua-praxis-leaf");
    expect(na, "which the na page has no notion of").not.toContain("ua-praxis-leaf");
    expect(na, "na's page is the spectrum").toContain("--faction-default-rainbow");
  });

  it("resolves through the manifest thunk to the same component", async () => {
    const Resolved = await resolvedArchetype(surfaceMap("praxisDetail")["ua"]);
    expect(Resolved).toBe(UaPraxisDetail);
  });
});

describe("UA praxis detail — copy is neutral (ADR-0061)", () => {
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
              metatask_faction_slug: "ua",
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
      "Write-up",
      "Members",
      "Metatasks",
      "Cast your vote",
      "Who voted",
      "Discussion",
    ]) {
      expect(text, `the shared word for ${neutral}`).toContain(neutral);
    }

    // The vocabulary #1119 lists under **Voice**. It is RECORDED, not built:
    // the ADR-0061 amendment that would have permitted it was written and
    // withdrawn the same day (2026-07-28). "Base" / "Marks" / "Post" are omitted
    // from this sweep only where they collide with a shared neutral string;
    // "Marks" does not, so it is checked.
    for (const voiced of [
      "The sheet",
      "Marks",
      "The contest",
      "Revise the sheet",
      "Top mark",
    ]) {
      expect(text, `no voiced copy: ${voiced}`).not.toContain(voiced);
    }
  });

  it("ships no detail.ua.* block for the page to read", async () => {
    // The catalog side of the same rule. UA legitimately owns copy elsewhere —
    // the praxis CARD's masthead and the comment voice's margin prompt — and
    // neither is this page's, so the assertion is scoped to `detail`.
    const catalog = (await import("../../../locales/en/praxis.json")).default as Record<
      string,
      Record<string, unknown>
    >;
    expect(Object.keys(catalog.detail)).not.toContain("ua");
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
          admin_note: "Proof shows a different mesa.",
        },
      }),
    );
    expect(failed.text, "the shared failure notice").toContain("marked as failed");
    expect(failed.text, "with the steward note").toContain("different mesa");
  });

  it("leaves the report card outside the costume", () => {
    // `PraxisFlagBlock` takes `state` and nothing else — there is no seam to
    // dress it through — so the guard is that the neutral card is present and
    // wearing neutral tokens, not UA sheet chrome.
    const { html } = render(state());
    // Bounded at the aside's close — the flag card is its last child, so an
    // unbounded slice would swallow the comments region and its dress.
    const card = html.slice(indexOf(html, "sidebar-card"), indexOf(html, "</aside>"));
    expect(card, "the report card is bare").not.toContain("--faction-ua");
    expect(html, "and reads the shared words").toContain("Flag this praxis");
  });
});

describe("UA praxis detail — the layout contract (#1129)", () => {
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

describe("UA praxis detail — the dress", () => {
  it("wears the practice palette and both faces", () => {
    const { html } = render(state());
    expect(html, "the toothed leaf").toContain("ua-praxis-leaf");
    expect(html, "Cormorant Garamond").toContain("--faction-ua-card-font");
    expect(html, "EB Garamond").toContain("--faction-ua-body-font");
    expect(html, "the sienna rule").toContain("--faction-ua-card-frame");
    expect(html, "the neutral hairline").toContain("--faction-ua-rule");
  });

  it("draws the lotus once and the ensō only where it is reserved", () => {
    const { html } = render(state());
    // The lotus is the ground wash, one instance, bleeding off the gutter edge
    // behind the copy (§5's stacking half — `-1`, never `0`). Counted on the
    // drawing's ink filter rather than on its colour token: the mark resolves
    // that token on ten separate fills, so a token count counts petals.
    expect(html.match(/<feTurbulence/g)?.length, "one lotus, one ink filter").toBe(1);
    expect(html, "tinted from UA, not a literal").toContain("--faction-ua-card-lotus");
    expect(html, "behind the copy, not over it").toContain("z-index:-1");
    // The mark is reserved for the SCORE and the FACTION MARK (§6/#849). The
    // score half is `ScoreStamp`'s ensō; this page draws the faction half
    // exactly once, on the task-reference row. `Enso` ships as a masked asset,
    // and each instance emits the prefixed declaration once — the unprefixed
    // twin means a bare `enso.webp` count doubles.
    expect(
      html.match(/-webkit-mask-image:url\(\/factionMarks\/enso\.webp\)/g)?.length,
      "score stamp + one faction mark",
    ).toBe(2);
  });

  it("never uses an ink-family token as a fill (#1155)", () => {
    // The 1.05:1 shape: `--faction-{slug}-card-muted` is muted TEXT and every
    // caller in the app reads it as `color:`. UA is the faction most exposed to
    // it — warm accent, warm paper — so this asserts the role directly.
    const { html } = render(state());
    for (const ink of ["card-muted", "card-text", "card-body", "card-accent"]) {
      expect(html, `${ink} is ink, never a ground`).not.toContain(
        `background:var(--faction-ua-${ink})`,
      );
    }
    // The one ink-adjacent family used as a fill is the rank ramp, which is a
    // documented ornament ladder carrying no text.
    expect(html, "the voter rungs grade on the ramp").toContain("--faction-ua-rank-");
  });

  it("gives the rail the stock its mounted components were measured on", () => {
    // Not a taste call: `UaScoreStamp`'s box lifts off `--faction-ua-card-bg` in
    // light and sinks below it in dark, and `UaVote` punches its mandala cores
    // to that same token so the figure reads as an aperture. A plate painted in
    // `-lift` or `-panel` breaks both.
    const { html } = render(state());
    // #2673 put this page on `factionRoleVars`, so the plate reads the `paper`
    // ROLE and the map supplies the token. `resolveRoleReads` folds the one into
    // the other, so a repoint to `-lift` or `-panel` still fails.
    expect(resolveRoleReads(html), "the rail plates are the sheet").toMatch(
      /background:var\(--faction-ua-card-bg\)/,
    );
  });

  it("carries no unaffiliated spectrum of its own", () => {
    // The na tell is `--faction-default-rainbow`. A UA page that leaks one is a
    // Default that has not actually been replaced.
    expect(render(state()).html).not.toContain("--faction-default-rainbow");
  });

  it("writes no inline animation — UA is the quiet practice", () => {
    // Every faction motion in the house is class-gated on reduced-motion. This
    // page draws none at all; the one moving thing on it is the vote mandala,
    // which owns its own gate.
    expect(render(state()).html).not.toContain("animation:");
  });
});

describe("UA praxis detail — the state axes", () => {
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

    // A settled duel DOES draw one, wearing this page's sheet chrome and its
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
    expect(render(state({ isOwner: true, user: VIEWER })).text, "the owner does").toContain(
      "unsubmit",
    );
    expect(
      render(state({ isOwner: true, user: VIEWER })).text,
      "and no link that would round-trip",
    ).not.toContain("edit this praxis");
    expect(render(state({ showAdminBar: true })).text, "a steward gets the bar").toContain(
      "ADMIN",
    );
  });
});
