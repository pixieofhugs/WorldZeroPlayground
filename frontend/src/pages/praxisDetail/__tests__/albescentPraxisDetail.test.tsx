/**
 * Albescent praxis detail — the wrapper contract (#1140, epic #1085, ADR-0048).
 *
 * `archetypeSlots.test.tsx` already walks this archetype for the content slots
 * every praxis-detail skin must emit, and `unaffiliatedDetailV2.test.tsx` guards
 * the shared layout it inherits. Neither can state the thing that makes this
 * file Albescent rather than an eighth skin, which is what this file is for:
 *
 *   **Strip the three ornament layers and the page is `DefaultPraxisDetail`
 *   byte for byte.**
 *
 * That is asserted directly, over every state axis the issue lists — published /
 * flagged / failed, crowned or not, solo / collab / duel, visitor / owner /
 * steward, with and without metatasks — at BOTH form factors. A skin that
 * repainted a hue, moved a block or spoke a word would fail it, and so would a
 * regression in the shared page that Albescent silently forked around.
 *
 * The second half is the words. The design is heavily voiced ("the ask", "what
 * was attended", "bear witness", …) and the owner ruled on 2026-07-28 that none
 * of it is built: a per-faction WORD is as identifying as a per-faction hue
 * (ADR-0027, WORLD_ZERO_STYLE §3), and it renders to every viewer. ADR-0061's
 * standing rule is dress and no copy; this faction is doubly clear of it, declining
 * it. The byte-for-byte assertion covers that structurally — a voiced string
 * would break equality — and the vocabulary is spelled out below anyway so the
 * ruling survives as a readable test rather than as an implication.
 *
 * Harness note: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md), so
 * `useFormFactor` is mocked rather than driven off a viewport. Light vs dark is
 * a pure `[data-theme]` cascade with no branch in either component, so there is
 * nothing here to assert about it — it is an eyeball check.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
import type { PraxisDetailState } from "../usePraxisDetail";
import type { DuelDetailOut, DuelSideOut } from "../../../api/duel";
import type { CurrentUser } from "../../../api/auth";
import { aMember, aPraxis, aTask } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

// Imported after the mock so both archetypes pick it up.
const { default: DefaultPraxisDetail } = await import("../archetypes/DefaultPraxisDetail");
const { default: AlbescentPraxisDetail } = await import("../archetypes/AlbescentPraxisDetail");

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
  task_faction_slug: "albescent",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "albescent",
  members: [MEMBER],
});

const SEAL = aTask({
  id: 501,
  title: "Composting",
  point_value: 60,
  level_required: 0,
  task_type: "metatask",
  created_by: 9,
  metatask_faction_slug: "snide",
  created_by_display_name: "",
  can_sign_up: false,
  allowed_modes: [],
  eligible_for_current_user: false,
});

const MINE: DuelSideOut = {
  praxis_id: 1,
  character_id: 3,
  display_name: "Ada",
  faction_slug: "albescent",
  avatar_url: "",
  points_from_votes: 18,
  is_submitted: true,
  nudged_at: null,
};

const RIVAL: DuelSideOut = {
  praxis_id: 2,
  character_id: 4,
  display_name: "Rax",
  faction_slug: "snide",
  avatar_url: "",
  points_from_votes: 15.4,
  is_submitted: true,
  nudged_at: null,
};

const DUEL: DuelDetailOut = {
  id: 5,
  task_id: 7,
  status: "settled",
  forfeited_by_character_id: null,
  challenger: MINE,
  opponent: RIVAL,
  winner_character_id: null,
  challenger_final_points: null,
  opponent_final_points: null,
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
    faction_slug: "albescent",
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

type Skin = typeof DefaultPraxisDetail;

function render(
  Archetype: Skin,
  next: PraxisDetailState,
  formFactor: "desktop" | "mobile" = "desktop",
): string {
  mocks.formFactor = formFactor;
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={next} />
    </MemoryRouter>,
  );
}

/** The wrapper element and the three ornament layers, removed. */
function undress(html: string): string {
  return html
    .replace(/<span[^>]*class="alb-praxis-[a-z]+"[^>]*><\/span>/g, "")
    .replace(/^<div class="alb-praxis">/, "")
    .replace(/<\/div>$/, "");
}

/** Every state axis the issue asks to be checked, as one table. */
const AXES: Array<[string, PraxisDetailState]> = [
  ["published, visitor", state()],
  ["flagged", state({ praxis: { ...PRAXIS, moderation_status: "flagged" } })],
  [
    "failed with a steward note",
    state({
      praxis: {
        ...PRAXIS,
        moderation_status: "failed",
        admin_note: "The photo is of a different ridge.",
      },
    }),
  ],
  ["crowned", state({ praxis: { ...PRAXIS, is_top_for_task: true } })],
  [
    "collab",
    state({ praxis: { ...PRAXIS, type: "collab", members: [MEMBER, CO_MEMBER] } }),
  ],
  [
    "duel",
    state({ praxis: { ...PRAXIS, type: "duel", duel_id: 5 }, duel: DUEL }),
  ],
  ["owner", state({ isOwner: true, user: VIEWER })],
  ["steward", state({ showAdminBar: true, user: VIEWER })],
  ["sealed with a metatask", state({ praxis: { ...PRAXIS, applied_metatasks: [SEAL] } })],
  ["unvoted", state({ voters: [] })],
];

describe("Albescent praxis detail is Default plus light", () => {
  for (const [axis, next] of AXES) {
    for (const formFactor of ["desktop", "mobile"] as const) {
      it(`${axis} (${formFactor}) renders Default byte for byte once undressed`, () => {
        // `render` mutates the shared form-factor mock, so take Default's
        // markup first and re-set the factor for the second render.
        const plain = render(DefaultPraxisDetail, next, formFactor);
        const dressed = render(AlbescentPraxisDetail, next, formFactor);
        expect(undress(dressed)).toBe(plain);
      });
    }
  }
});

describe("Albescent praxis detail — where the light sits", () => {
  it("mounts all three layers INSIDE the sheet, not around the page", () => {
    // WORLD_ZERO_STYLE §5 / the #1028 ruling: a skin owns its own column, never
    // the window. The layers arrive through `DefaultPraxisDetail`'s `ornament`
    // slot, so they sit after the 1200 sheet's own style and inherit its
    // `overflow: hidden` — the site background still shows around the page.
    const html = render(AlbescentPraxisDetail, state());
    const sheet = html.indexOf("max-width:1200px");
    expect(sheet, "the sheet renders").toBeGreaterThan(-1);

    for (const layer of ["alb-praxis-aurora", "alb-praxis-ring", "alb-praxis-edge"]) {
      const at = html.indexOf(layer);
      expect(at, `${layer} renders`).toBeGreaterThan(-1);
      expect(at, `${layer} sits inside the sheet`).toBeGreaterThan(sheet);
    }
  });

  it("never reaches for a full-viewport ground", () => {
    const html = render(AlbescentPraxisDetail, state());
    expect(html, "no full-page wash").not.toContain("na-backdrop");
    expect(html, "no fixed inset ground").not.toContain("position:fixed");
  });

  it("dresses nothing but those three layers", () => {
    // The wrapper plus exactly three ornament spans, and — since #2501 — the
    // score stamp's own wrapper, which this page does not put there: the rail is
    // `ScoreStamp`'s (ADR-0053) and it dispatches on the TASK's faction, so an
    // Albescent task lands `AlbescentScoreStamp` inside the page whatever the
    // page does. The set is asserted rather than the count so a NEW dress is
    // named here instead of silently keeping a number right. Anything else
    // carrying an `alb-` class would mean a block had been skinned — the report
    // card and the steward bar above all, which ADR-0061 keeps outside the
    // costume.
    const html = render(AlbescentPraxisDetail, state({ showAdminBar: true, user: VIEWER }));
    expect(
      [...new Set(html.match(/alb-[\w-]+/g))].sort(),
      "wrapper + three layers + the dispatched stamp, nothing else",
    ).toEqual([
      "alb-praxis",
      "alb-praxis-aurora",
      "alb-praxis-edge",
      "alb-praxis-ring",
      "alb-stamp",
    ]);
    expect(html.match(/alb-/g)?.length, "each of the five drawn once").toBe(5);
    expect(html, "the report card is mounted bare").toContain("sidebar-card");
  });

  it("writes no inline animation, so reduced motion is honoured by the cascade", () => {
    // index.css owns every keyframe and the `no-preference` gate; a component
    // may not inject a stylesheet or an inline `animation:` (#911).
    expect(render(AlbescentPraxisDetail, state())).not.toContain("animation");
  });
});

describe("Albescent praxis detail keeps the light and loses the words", () => {
  // The design's vocabulary, verbatim from #1140. Recorded here rather than
  // built (owner ruling, 2026-07-28) — see the file docstring.
  const UNBUILT_VOICE = [
    "the ask",
    "what was attended",
    "entered together by",
    "metatasks kept",
    "witness",
    "bear witness",
    "who has read it",
    "said quietly",
    "enter it",
    "revise the account",
  ];

  it("speaks the shared neutral copy on every state", () => {
    for (const [axis, next] of AXES) {
      const text = render(AlbescentPraxisDetail, next).replace(/<[^>]*>/g, "").toLowerCase();
      for (const word of UNBUILT_VOICE) {
        expect(text, `${axis} must not speak "${word}"`).not.toContain(word);
      }
    }
  });

  it("keeps the neutral headings the shared page owns", () => {
    const text = render(AlbescentPraxisDetail, state()).replace(/<[^>]*>/g, "");
    expect(text, "the write-up heading").toContain("Write-up");
    expect(text, "the proof heading").toContain("Proof");
    expect(text, "the score heading").toContain("Score");
    expect(text, "the voters heading").toContain("Who voted");
  });

  it("shows the crown at both form factors", () => {
    // ADR-0054 + the owner's #1140 ruling: never form-factor gated, never
    // restyled out of the page, even where the design hides it on a phone.
    // The mark is the score stamp's corner fleur now — #1710 retired the
    // hero banner. The score block is in both layouts, so it is still never
    // form-factor gated, and it is still the one canonical `TaskCrown`.
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render(AlbescentPraxisDetail, crowned, "desktop")).toContain(crown);
    expect(render(AlbescentPraxisDetail, crowned, "mobile")).toContain(crown);
    expect(render(AlbescentPraxisDetail, state(), "mobile")).not.toContain(crown);
  });
});
