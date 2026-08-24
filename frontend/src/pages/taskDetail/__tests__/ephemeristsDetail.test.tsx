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
    dropConfirm: null,
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

  it("wears the Valley dress — masthead band, notation band, engraved title", () => {
    const { html, text } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html, "papyrus page sheet").toContain("eph-plate-sheet");
    expect(html, "cornice masthead band").toContain("--faction-ephemerists-plate-band");
    // Two incised glyph registers (`epg-glyph`) were asserted here. #2210
    // retired them: the notation band is the head's only ornament row, and the
    // block further down is what says so.
    // THE STEPPED OCTAGON MEDALLION LEFT IN #2554 — a ~60-line drawing this
    // page made of a score the faction's `EphemeristsScoreStamp` already
    // struck in its compass rose (#2145). The rose's graduated limb is the
    // mark that stands here now.
    expect(html, "the compass rose that replaced it").toContain(
      '<circle cx="50" cy="50" r="47"',
    );
    expect(text, "the masthead wordmark").toContain("The Ephemerists");
    // The kite's opening move; brushed rather than ruled since Sigil Studies v2.
    expect(html, "the masthead's kite sigil").toContain("M19.1 30.8");
    // The masthead's four-kanji register (星 暦 観 録) was asserted here.
    // #1909 CUT all EIGHT of its strings — the marks and their English glosses
    // — because no other faction had a register row and the audit ruled the
    // masthead generic. Held as an absence so a voice pass cannot put a
    // faction-only band back on a settled surface.
    expect(text, "the retired four-kanji register").not.toContain("星");
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
    // `×\d`, not a bare `×`. The modifier row's whole copy is `×{{multiplier}}`
    // (`tasks.json`), so the FACTOR is what makes the row a row — and #2067's
    // rune strips march a `×` of their own through the page's text content as
    // ornament. A bare-character proxy for the concept fails the moment the
    // sheet grows a decorative row of mathematical symbols, which is exactly
    // what happened; the ornament is `aria-hidden` and reads to nobody.
    expect(neutral.text).not.toMatch(/×\d/);
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

  it("stands the brief on the chart, at the PAGE's weight and not the design's (#2144)", () => {
    const { html } = render(<EphemeristsTaskDetail state={baseState()} />);
    // The net, not the journal ruling this leaf used to draw for itself.
    expect(html).toContain('viewBox="0 0 1000 600"');
    expect(html).not.toContain("repeating-linear-gradient(180deg");
    // 0.17. The design says 0.42, which puts the net's diagonals at the weight
    // of a 13px serif's strokes over what is body copy; the owner walked it
    // down to the page's own number. The upgrade path if the brief ever needs
    // to read as more written-on is BOTH grounds, never a heavier net.
    expect(html).toContain("opacity:0.17");
    expect(html).not.toContain("opacity:0.42");
    // A ground, not a veil: the leaf isolates so the net's negative layer lands
    // above the plate's fill and below every ink printed on it.
    expect(html).toContain("isolation:isolate");
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

  /**
   * THE REGISTER HAS TWO HALVES AGAIN (#2141), so this block asks a different
   * question than it did between #1627 and now — and the SHAPE of the question
   * is what matters, because both wrong answers are silent.
   *
   * #1627 took the register theme-INVARIANT: the papyrus half could not survive
   * the card contract moving onto the cornice band, because one set of card ink
   * names then had to serve two grounds of opposite polarity. This block checked
   * that, token by token, by asserting no token appeared under
   * `[data-theme="dark"]`. #2141 kept the BAND at the compass blue in both
   * cascades and gave the SHEET a vellum light half, so most of the family owes
   * a value in both again — and five members deliberately still do not.
   *
   * Both failure modes are invisible to `factionContrast.test.ts`, which
   * measures whatever is declared and would happily pass either way:
   *   • a two-theme token missing its dark half silently ships a vellum ink on
   *     a night sheet;
   *   • a dark override on an INVARIANT silently un-freezes the compass blue,
   *     which is the one thing holding the card contract's polarity still.
   * So the assertion is per token and by name, not a count.
   */
  const THEME_INVARIANT = new Set([
    // The compass blue and its two inks — the faction, not a mode (#2140).
    "--faction-ephemerists-plate-band",
    "--faction-ephemerists-plate-band-ink",
    "--faction-ephemerists-plate-band-quiet",
    // The dark chip the metals are struck on; they have no light value at all.
    "--faction-ephemerists-plate-disc",
    // One value across all three grounds by construction (3.73 / 3.58 / 3.55).
    "--faction-ephemerists-plate-brass-rule",
    // Struck only on the chip above, so likewise no light value to differ from.
    "--faction-ephemerists-plate-gold",
    // `none` in both cascades since #1627 — an absence, not a colour.
    "--faction-ephemerists-plate-wash",
  ]);

  for (const token of referenced) {
    const invariant = THEME_INVARIANT.has(token);
    it(`${token} is declared in :root${invariant ? " and nowhere else" : " and in dark"}`, () => {
      expect(themes.light.has(token), "light / :root").toBe(true);
      expect(
        themes.dark.has(token),
        invariant
          ? `${token} is theme-invariant on purpose (#2141) — a \`[data-theme="dark"]\` value un-freezes the compass blue the card contract's polarity rests on`
          : `${token} is a two-theme contract since #2141 — without a \`[data-theme="dark"]\` value it ships its VELLUM value on the night sheet`,
      ).toBe(!invariant);
    });
  }

  it("the invariant set is the whole of it — nothing else escapes the dark half", () => {
    // The set above is a claim about the register, so it is checked against the
    // register rather than against this page's imports: a token this file never
    // names could still be missing its dark half.
    const family = [...themes.light.keys()].filter((name) =>
      name.startsWith("--faction-ephemerists-plate-"),
    );
    expect(family.length).toBeGreaterThan(15);
    expect(family.filter((name) => !themes.dark.has(name)).sort()).toEqual(
      [...THEME_INVARIANT].sort(),
    );
  });
});

/**
 * #1654 — the page draws the kit's marks, at the PAGE's densities.
 *
 * Seven of this file's declarations were transcriptions of `ephemeristsPlate`'s
 * — `GLYPHS`, the register and its marks, `Octagon`, `Cornice`, `Tally`, `Sign` —
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

  it("heads the page with the notation band and no glyph register (#2210)", () => {
    // This asserted the OPPOSITE until #2210: 44 signs a row, twice, filled
    // from the 1200px cap. #2143 hung the mathematical notation band under the
    // wordmark and left both registers standing, so the page wore two glyph
    // vocabularies at once and the lower row ran through the band's own marks.
    // The registers retire; the band is the head's last line and its only
    // ornament row, and the page's section heads keep the brass hairline that
    // already flexes across each heading row.
    const html = page();
    expect(html, "the retired incised registers").not.toContain("epg-glyph");
    expect(html, "the notation band's closing rule").toContain("3px double");
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
