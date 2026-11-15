/**
 * Ephemerists task detail (#1032): what the shared suites cannot see. The retired
 * Discordant Map voice and the design's own words stay out (ADR-0057); the Valley
 * dress leaves stable hooks; the roster the design builds stays unmounted (owner
 * ruling 2026-07-28); plate tokens are declared per theme. Submissions stay
 * empty: no DOM for <PraxisCard>.
 */
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
import { readIndexCss } from "../../../test/indexCss";

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
    // #1124 retired the `Task №{id}` crumb.
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
    // The design's own words are not authority either.
    for (const invented of ["in full", "Bonus", "Ally", "Rival", "Say something"]) {
      expect(text).not.toContain(invented);
    }
  });

  it("wears the Valley dress — masthead band, notation band, engraved title", () => {
    const { html, text } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html, "papyrus page sheet").toContain("eph-plate-sheet");
    expect(html, "cornice masthead band").toContain("--faction-ephemerists-plate-band");
    // The worth mark is the stamp's compass rose (#2554, #2145).
    expect(html, "the compass rose that replaced it").toContain(
      '<circle cx="50" cy="50" r="47"',
    );
    expect(text, "the masthead wordmark").toContain("The Ephemerists");
    // The kite's opening path command.
    expect(html, "the masthead's kite sigil").toContain("M19.1 30.8");
    // #1909 cut the kanji register; held as an absence.
    expect(text, "the retired four-kanji register").not.toContain("星");
    // The codex ground belongs to other Ephemerists surfaces.
    expect(html, "retired illuminated-codex ground").not.toContain("--eph-vellum");
  });

  it("crowns the action panel with nothing — the sigil is the only mark (#1634)", () => {
    // Both the mark and its reserved space must be gone, or a gap remains.
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
    // `×\d`: #2067's aria-hidden rune strips carry a bare ornamental `×`.
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
    expect(html).toContain('viewBox="0 0 1000 600"');
    expect(html).not.toContain("repeating-linear-gradient(180deg");
    // 0.17, not the design's 0.42 (owner): the net must not outweigh body copy.
    // Need more? Change both grounds, never a heavier net.
    expect(html).toContain("opacity:0.17");
    expect(html).not.toContain("opacity:0.42");
    // Isolation keeps the net's negative layer above the fill, below the ink.
    expect(html).toContain("isolation:isolate");
  });

  it("never links the gallery out at the task_id feed filter", () => {
    // The gallery expands in place (#1030).
    const { html } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });
});

describe("the Valley plate's tokens", () => {
  const themes = readThemes(
    readIndexCss(),
  );
  const referenced = [
    ...new Set(
      render(<EphemeristsTaskDetail state={baseState()} />).html.match(
        /--faction-ephemerists-plate-[\w-]+/g,
      ) ?? [],
    ),
  ];

  it("names at least the whole plate family", () => {
    expect(referenced.length).toBeGreaterThan(10);
  });

  /**
   * Since #2141 most plate tokens owe a value in both themes and a few are
   * deliberately theme-invariant. Both mistakes are silent to
   * `factionContrast.test.ts`: a missing dark half ships vellum ink on the night
   * sheet; a dark override un-freezes the compass blue. So: per token, by name.
   */
  const THEME_INVARIANT = new Set([
    // The compass blue and its ink: the faction, not a mode (#2140).
    "--faction-ephemerists-plate-band",
    "--faction-ephemerists-plate-band-ink",
    // The dark chip the metals are struck on.
    "--faction-ephemerists-plate-disc",
    // One value across all three grounds by construction.
    "--faction-ephemerists-plate-brass-rule",
    // Struck only on the chip above.
    "--faction-ephemerists-plate-gold",
    // `none` in both cascades (#1627).
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
    // Checked against the whole register, not just this page's references.
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
 * #1654: the page draws `ephemeristsPlate`'s marks at its own densities. The
 * no-copy guard is `ephemeristsPlateSurfaces.test.tsx`; these counts catch a
 * wrong import or lost prop.
 */
describe("the Valley page's ornament comes from the kit unchanged (#1654)", () => {
  const page = () => render(<EphemeristsTaskDetail state={baseState()} />).html;

  it("strikes the page cornice's 52 flutes", () => {
    // Short flutes are half of 52. The card's 40 is a prop; this is the default.
    expect(page().match(/height:3\.5px/g)).toHaveLength(26);
  });

  it("heads the page with the notation band and no glyph register (#2210)", () => {
    // #2210: the notation band is the head's only ornament row.
    const html = page();
    expect(html, "the retired incised registers").not.toContain("epg-glyph");
    expect(html, "the notation band's closing rule").toContain("3px double");
  });

  it("strikes the summons in platinum, off the shared sign table", () => {
    expect(page()).toContain(PLATINUM.glyph);
  });
});

/**
 * #1664: the byline monogram is the kit's `initialsOf`, including a
 * whitespace-only name (reachable via `PATCH /characters/{id}`), which must
 * strike the kit's "·" rather than leave an empty disc.
 */
describe("the byline monogram, when the author has no name (#1664)", () => {
  /** Matches one span: the octagon paints its disc as an SVG `fill`. */
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
