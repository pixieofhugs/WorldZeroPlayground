/**
 * Albescent praxis detail, the wrapper contract (#1140, ADR-0048): strip the
 * ornament layers and the page is `DefaultPraxisDetail` byte for byte, on every
 * state axis at both form factors.
 *
 * No voiced copy either (owner ruling 2026-07-28): a per-faction word is as
 * identifying as a hue (ADR-0027). The vocabulary is listed below explicitly.
 */
import { describe, it, expect, vi } from "vitest";
import type { PraxisDetailState } from "../usePraxisDetail";
import { aCharacter, aCurrentUser, aDuel, aDuelSide, aMetatask, aPraxis } from "../../../test/fixtures";
import { CO_MEMBER, MEMBER, RIVAL, VOTERS, aPraxisDetailState, renderPraxisDetail } from "../../../test/praxisDetail";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

const PRAXIS = aPraxis({
  task_title: "A Chore Nobody Logged",
  task_faction_slug: "albescent",
  created_by_id: 3,
  created_by_display_name: "Ada",
  created_by_faction_slug: "albescent",
  members: [MEMBER],
});

const SEAL = aMetatask({ metatask_faction_slug: "snide" });

const DUEL = aDuel({
  challenger: aDuelSide({ faction_slug: "albescent", points_from_votes: 18 }),
  opponent: RIVAL,
});

const VIEWER = aCurrentUser({
  character: aCharacter({ faction_slug: "albescent", level: 4 }),
});

const state = (overrides: Partial<PraxisDetailState> = {}): PraxisDetailState =>
  aPraxisDetailState({ praxis: PRAXIS, voters: VOTERS, ...overrides });

function render(
  slug: "na" | "albescent",
  next: PraxisDetailState,
  formFactor: "desktop" | "mobile" = "desktop",
): string {
  mocks.formFactor = formFactor;
  return renderPraxisDetail(slug, next).html;
}

/** Removes the wrapper (classes incl. `alb-prism`, #2499) and ornament spans. */
function undress(html: string): string {
  return html
    .replace(/<span[^>]*class="alb-praxis-[a-z]+"[^>]*><\/span>/g, "")
    .replace(/^<div class="alb-praxis alb-moves alb-prism">/, "")
    .replace(/<\/div>$/, "");
}

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
        const plain = render("na", next, formFactor);
        const dressed = render("albescent", next, formFactor);
        expect(undress(dressed)).toBe(plain);
      });
    }
  }
});

describe("Albescent praxis detail — where the light sits", () => {
  it("mounts both layers INSIDE the sheet, not around the page", () => {
    // A skin owns its column, never the window (STYLE §5, #1028).
    const html = render("albescent", state());
    const sheet = html.indexOf("max-width:1200px");
    expect(sheet, "the sheet renders").toBeGreaterThan(-1);

    for (const layer of ["alb-praxis-ring", "alb-praxis-edge"]) {
      const at = html.indexOf(layer);
      expect(at, `${layer} renders`).toBeGreaterThan(-1);
      expect(at, `${layer} sits inside the sheet`).toBeGreaterThan(sheet);
    }
  });

  it("never reaches for a full-viewport ground", () => {
    const html = render("albescent", state());
    expect(html, "no full-page wash").not.toContain("na-backdrop");
    expect(html, "no fixed inset ground").not.toContain("position:fixed");
  });

  it("dresses nothing but those two layers", () => {
    // `alb-stamp` comes from `ScoreStamp` dispatching on the TASK's faction
    // (#2501), not from this page. Any other `alb-` class means a block was
    // skinned (ADR-0061).
    const html = render("albescent", state({ showAdminBar: true, user: VIEWER }));
    expect(
      [...new Set(html.match(/alb-[\w-]+/g))].sort(),
      "wrapper + prism + two layers + the dispatched stamp, nothing else",
    ).toEqual([
      "alb-moves",
      "alb-praxis",
      "alb-praxis-edge",
      "alb-praxis-ring",
      "alb-prism",
      "alb-stamp",
    ]);
    // `alb-moves` twice: the wrapper and the dispatched stamp.
    expect(html.match(/alb-/g)?.length, "the six drawn once each, the marker twice").toBe(7);
    expect(html, "the report card is mounted bare").toContain("sidebar-card");
  });

  it("writes no inline animation, so reduced motion is honoured by the cascade", () => {
    // index.css owns keyframes and the reduced-motion gate (#911).
    expect(render("albescent", state())).not.toContain("animation");
  });
});

describe("Albescent praxis detail keeps the light and loses the words", () => {
  // The design's vocabulary from #1140, deliberately unbuilt.
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
      const text = render("albescent", next).replace(/<[^>]*>/g, "").toLowerCase();
      for (const word of UNBUILT_VOICE) {
        expect(text, `${axis} must not speak "${word}"`).not.toContain(word);
      }
    }
  });

  it("keeps the neutral headings the shared page owns", () => {
    const text = render("albescent", state()).replace(/<[^>]*>/g, "");
    expect(text, "the write-up heading").toContain("Write-up");
    expect(text, "the proof heading").toContain("Proof");
    expect(text, "the score heading").toContain("Score");
    expect(text, "the voters heading").toContain("Who voted");
  });
});
