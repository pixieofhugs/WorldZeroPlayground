/**
 * The Ephemerists task detail — THE VALLEY PLATE (#1032).
 *
 * `archetypeSlots` already guards the content slots and `detailContract` the
 * three shared decisions, for this skin along with every other. What is left,
 * and what this file pins, is the stuff that is specific to rebuilding THIS
 * archetype and that a green tsc/eslint/vitest would otherwise say nothing
 * about:
 *
 *  1. The retired metaphor is actually gone. The 909-line "Discordant Map" and
 *     its faction voice (`credence`, `ephemerides`, `commission`, `puncta`,
 *     `triangulating`) were replaced, not wrapped — and ADR-0057 means none of
 *     the DESIGN's words ("in full", "Bonus", "Ally"/"Rival") arrived either.
 *  2. The Valley dress is present. A skin that rendered as unstyled boxes still
 *     passes every slot test; the masthead band, the incised glyph registers and
 *     the crowned panel leave stable markup hooks, so absence is detectable.
 *  3. The roster stayed dead. The design BUILDS a full roster section — octagon
 *     avatars, tally strokes, Ally/Rival tags, a "+N more players" row — and
 *     never mounts it. Owner ruling 2026-07-28 cut it for every skin, so this is
 *     the one place a future port-by-copying would reintroduce it.
 *  4. Every `--faction-ephemerists-plate-*` token this skin paints with is
 *     declared in BOTH themes. A token declared only in `:root` looks fine until
 *     someone flips to dark, and nothing else we run compares the two blocks by
 *     name.
 *
 * `sortedSubmissions` is left empty throughout: `<PraxisCard>` is the
 * context-bound wrapper and this harness has no DOM and runs no effects (the
 * gallery's own composition is guarded by factionCardSlots).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import EphemeristsTaskDetail from "../archetypes/EphemeristsTaskDetail";
import { initialsOf, PLATINUM } from "../../../components/factionMarks/ephemeristsPlate";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import { readThemes } from "../../../utils/__tests__/cssVars";
import type { TaskDetailState } from "../useTaskDetail";
import { aTask } from '../../../test/fixtures'

const TASK = aTask({
  id: 305,
  title: "Catalogue every bench along the river walk",
  description: "Walk the water from the lock to the last lamp.",
  point_value: 30,
  level_required: 4,
  created_by: 31,
  primary_faction_slug: "ephemerists",
  in_progress_count: 9,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "ephemerists",
  created_by_level: 4,
});

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    submissions: [],
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 30,
    factionMultiplier: 1.0,
    modifiedPoints: 30,
    inProgressCount: 9,
    topScore: 0,
    voteCount: 0,
    submissionSort: "score",
    setSubmissionSort: () => {},
    sortedSubmissions: [],
    signupError: null,
    handleSignup: async () => {},
    handleDrop: async () => {},
    ...overrides,
  };
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

describe("Ephemerists task detail — the Valley plate", () => {
  it("is what the manifest dispatches for the slug", () => {
    expect(resolvedArchetype(surfaceMap("taskDetail").ephemerists)).toBe(EphemeristsTaskDetail);
  });

  it("speaks only the shared neutral copy", () => {
    const { text } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    // The breadcrumb is the shared "Tasks" crumb and nothing after it: #1124
    // retired `Task №{id}`, which was the trail's whole second crumb here (a
    // brass cartouche framing it).
    expect(text).toContain("Tasks");
    expect(text, "no task id in the breadcrumb").not.toContain("№");
    // ADR-0057: the retired Discordant Map voice.
    for (const retired of [
      "credence",
      "Ephemerides",
      "Cartographers",
      "Commission",
      "puncta",
      "triangulating",
    ]) {
      expect(text).not.toContain(retired);
    }
    // …and the design's own words, which are not authority either.
    for (const invented of ["in full", "Bonus", "Ally", "Rival", "Say something"]) {
      expect(text).not.toContain(invented);
    }
  });

  it("wears the Valley dress — masthead band, incised registers, engraved title", () => {
    const { html, text } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html, "papyrus page sheet").toContain("eph-plate-sheet");
    expect(html, "cornice masthead band").toContain("--faction-ephemerists-plate-band");
    expect(html, "incised glyph registers").toContain("epg-glyph");
    expect(html, "the stepped octagon medallion").toContain("M30 4 L70 4 L96 30");
    expect(text, "the masthead wordmark").toContain("The Ephemerists");
    expect(html, "the masthead's kite sigil").toContain("M243 120 L55 272 L243 490 L425 272 Z");
    expect(text, "the masthead's four-kanji register").toContain("星暦観録");
    // The codex ground belongs to the OTHER Ephemerists surfaces now.
    expect(html, "retired illuminated-codex ground").not.toContain("--eph-vellum");
  });

  it("crowns the action panel with nothing — the sigil is the only mark (#1634)", () => {
    // A 400px winged sun disc used to hang over the panel in reserved space, on
    // this page's own LOCAL copy of the shared kit's disc. Both halves of that
    // are asserted, because deleting the mark and leaving the reserve renders as
    // a plate floating below a gap that nothing explains.
    const { html } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html, "the retired crown's shadow class").not.toContain("eph-plate-crown");
    expect(html, "the disc's own wing geometry").not.toContain('viewBox="-88 -20 176 40"');
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
    expect(text).toContain("9");
  });

  it("hides the modifier row at the identity factor and shows it off it", () => {
    const neutral = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(neutral.text).not.toContain("×");
    expect(neutral.text, "the base is legible regardless").toContain("30");

    const modified = render(
      <EphemeristsTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 38 })}
      />,
    );
    expect(modified.text).toContain("×1.25");
    expect(modified.text).toContain("38");
  });

  it("draws the brief in full — no clamp, no read-more", () => {
    const long = "x".repeat(2000);
    const { text } = render(
      <EphemeristsTaskDetail
        state={baseState({ task: { ...TASK, description: long } })}
      />,
    );
    expect(text).toContain(long);
  });

  it("never links the gallery out at the task_id feed filter", () => {
    // The gallery expands in place instead (#1030's fix, inherited here) — the
    // reader stays on the task, even now that the URL filters (#1050).
    const { html } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });
});

describe("the Valley plate's tokens", () => {
  const themes = readThemes(
    readFileSync(fileURLToPath(new URL("../../../index.css", import.meta.url)), "utf8"),
  );
  const source = readFileSync(
    fileURLToPath(new URL("../archetypes/EphemeristsTaskDetail.tsx", import.meta.url)),
    "utf8",
  );
  const referenced = [
    ...new Set(source.match(/--faction-ephemerists-plate-[\w-]+/g) ?? []),
  ];

  it("names at least the whole plate family", () => {
    expect(referenced.length).toBeGreaterThan(10);
  });

  // The plate used to owe a value in BOTH cascades, and this block checked that
  // token by token. #1627 took the register theme-INVARIANT — the papyrus half
  // could not survive the card contract moving onto the cornice band, because
  // one set of card ink names then had to serve two grounds of opposite
  // polarity — so the question flips: every token is declared once in `:root`
  // and none of them may reappear under `[data-theme="dark"]`. A stray dark
  // override would resurrect the split this change exists to remove, and would
  // do it silently: `factionContrast.test.ts` measures whatever is declared, so
  // it would just go back to measuring two palettes, and pass.
  for (const token of referenced) {
    it(`${token} is declared once, in :root`, () => {
      expect(themes.light.has(token), "light / :root").toBe(true);
      expect(
        themes.dark.has(token),
        'the Valley plate is theme-invariant (#1627) — a `[data-theme="dark"]` value splits it back in two',
      ).toBe(false);
    });
  }
});

/**
 * #1654 — the page draws the kit's marks, at the PAGE's densities.
 *
 * Seven of this file's declarations were transcriptions of `ephemeristsPlate`'s
 * — `GLYPHS`, `Glyph`, `GlyphRegister`, `Octagon`, `Cornice`, `Tally`, `Sign` —
 * so a mark redrawn in the kit left this page on the old one, silently. The
 * source-tree guard against a fresh copy lives in
 * `praxisCard/__tests__/ephemeristsPlateSurfaces.test.tsx`; what only rendering
 * can say is that the collapse changed no ornament, and these are the counts a
 * wrong import or a lost prop would move while everything still built.
 */
describe("the Valley page's ornament comes from the kit unchanged (#1654)", () => {
  const page = () => render(<EphemeristsTaskDetail state={baseState()} />).html;

  it("strikes the page cornice's 52 flutes", () => {
    // Counted on the short flute the band alternates in — half of 52. The task
    // CARD strikes 40 of them across its 384px band; the two densities are the
    // two designs' and neither drifted from the other, so `Cornice` takes the
    // count as a prop and this page takes the default.
    expect(page().match(/height:3\.5px/g)).toHaveLength(26);
  });

  it("fills both masthead registers from the width, not a fixed 16", () => {
    // `Math.ceil(1200 / 27.5)` = 44 signs a row, twice. A fixed count would
    // stop short of the page edge at the 1200 cap; the design's own 16 is the
    // number the local copy documented itself as NOT using. Sliced to the
    // masthead's own svg so the page's rune bands — one per section head, and
    // a section count this has no opinion about — cannot move it.
    const masthead = page().slice(0, page().indexOf("</svg>"));
    expect(masthead.match(/class="epg-glyph"/g)).toHaveLength(44 * 2);
  });

  it("strikes the summons in platinum, off the shared sign table", () => {
    // The one entry the kit's `GLYPHS` did not have before this issue: both
    // copies filed `PLATINUM.glyph` under a sign name privately, so the table
    // took it in rather than the two call sites reaching around `Sign`.
    expect(page()).toContain(PLATINUM.glyph);
  });
});

/**
 * #1664 — the byline monogram is the KIT's, including its empty case.
 *
 * The seam is the rendered byline. This page carried its own `initialsOf`, and
 * it agreed with `ephemeristsPlate`'s on every input but one: given a display
 * name that is nothing but whitespace, the local copy returned `""` and the
 * kit's returns `"·"`. So the same character rendered a MARK in their monogram
 * on the praxis card, the comment row and the faction page, and an EMPTY disc
 * here — a slot that reads as a rendering failure rather than as "no name".
 *
 * That case is reachable: `CharacterCreate.display_name` is `min_length=1` and
 * `create_character` strips before rejecting, but `CharacterUpdate.display_name`
 * carries only `max_length=50` and `update_character` writes the value through
 * verbatim (mapping an explicit `null` to `""`). `PATCH /characters/{id}` with
 * `"   "` therefore lands a whitespace-only name in the column, and this page
 * shows it — `""` is caught by the byline's own truthiness gate, `"   "` is not.
 */
describe("the byline monogram, when the author has no name (#1664)", () => {
  /** The disc behind the byline initials — the medallion's octagon paints its
   *  own disc as an SVG `fill` attribute, so this matches one span. */
  const monogram = (html: string) =>
    html.match(/background:var\(--faction-ephemerists-plate-disc\)[^>]*>([^<]*)</)?.[1];

  it("strikes the kit's mark rather than leaving the disc empty", () => {
    const named = render(<EphemeristsTaskDetail state={baseState()} />).html;
    expect(monogram(named), "an ordinary name is unchanged").toBe("WA");

    const blank = render(
      <EphemeristsTaskDetail
        state={baseState({ task: { ...TASK, created_by_display_name: "   " } })}
      />,
    ).html;
    expect(monogram(blank)).toBe(initialsOf("   "));
    expect(monogram(blank), "the plate's no-name mark").toBe("·");
  });
});
