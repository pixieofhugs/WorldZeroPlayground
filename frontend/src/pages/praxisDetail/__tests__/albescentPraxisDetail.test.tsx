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
import { describe, it, expect, vi } from "vitest";
import i18n from "../../../i18n";
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

/**
 * Both skins come out of the same registry, named by slug: `na` is the
 * undressed page this one is claimed to BE underneath its three layers, and
 * comparing the two by slug is the comparison the dispatcher would make.
 */
function render(
  slug: "na" | "albescent",
  next: PraxisDetailState,
  formFactor: "desktop" | "mobile" = "desktop",
): string {
  mocks.formFactor = formFactor;
  return renderPraxisDetail(slug, next).html;
}

/**
 * The wrapper element and the ornament layers, removed.
 *
 * The wrapper carries TWO classes since #2499: `alb-praxis` (the isolation and
 * the media scope) and `alb-prism` (the ground). The second is not a span and
 * never was an element — it overrides `--faction-default-card-sheet`, which
 * `DefaultPraxisDetail` composes through `factionSheet()`. Peeling it is peeling
 * a class, and the claim underneath is unchanged: undressed, this IS the shared
 * page.
 */
function undress(html: string): string {
  return html
    .replace(/<span[^>]*class="alb-praxis-[a-z]+"[^>]*><\/span>/g, "")
    .replace(/^<div class="alb-praxis alb-moves alb-prism">/, "")
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
        const plain = render("na", next, formFactor);
        const dressed = render("albescent", next, formFactor);
        expect(undress(dressed)).toBe(plain);
      });
    }
  }
});

describe("Albescent praxis detail — where the light sits", () => {
  it("mounts both layers INSIDE the sheet, not around the page", () => {
    // WORLD_ZERO_STYLE §5 / the #1028 ruling: a skin owns its own column, never
    // the window. The layers arrive through `DefaultPraxisDetail`'s `ornament`
    // slot, so they sit after the 1200 sheet's own style and inherit its
    // `overflow: hidden` — the site background still shows around the page.
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
    // The wrapper plus exactly two ornament spans, and — since #2501 — the
    // score stamp's own wrapper, which this page does not put there: the rail is
    // `ScoreStamp`'s (ADR-0053) and it dispatches on the TASK's faction, so an
    // Albescent task lands `AlbescentScoreStamp` inside the page whatever the
    // page does. The set is asserted rather than the count so a NEW dress is
    // named here instead of silently keeping a number right. Anything else
    // carrying an `alb-` class would mean a block had been skinned — the report
    // card and the steward bar above all, which ADR-0061 keeps outside the
    // costume.
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
    // `alb-moves` is drawn TWICE — once on this wrapper and once on the score
    // stamp the sidebar dispatches, which is its own manifest row (#2501) and
    // carries its own marker.
    expect(html.match(/alb-/g)?.length, "the six drawn once each, the marker twice").toBe(7);
    expect(html, "the report card is mounted bare").toContain("sidebar-card");
  });

  it("writes no inline animation, so reduced motion is honoured by the cascade", () => {
    // index.css owns every keyframe and the `no-preference` gate; a component
    // may not inject a stylesheet or an inline `animation:` (#911).
    expect(render("albescent", state())).not.toContain("animation");
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

  it("shows the crown at both form factors", () => {
    // ADR-0054 + the owner's #1140 ruling: never form-factor gated, never
    // restyled out of the page, even where the design hides it on a phone.
    // The mark is the score stamp's corner fleur now — #1710 retired the
    // hero banner. The score block is in both layouts, so it is still never
    // form-factor gated, and it is still the one canonical `TaskCrown`.
    const crown = `title="${i18n.t("feed:taskCrown.title")}"`;
    const crowned = state({ praxis: { ...PRAXIS, is_top_for_task: true } });
    expect(render("albescent", crowned, "desktop")).toContain(crown);
    expect(render("albescent", crowned, "mobile")).toContain(crown);
    expect(render("albescent", state(), "mobile")).not.toContain(crown);
  });
});
