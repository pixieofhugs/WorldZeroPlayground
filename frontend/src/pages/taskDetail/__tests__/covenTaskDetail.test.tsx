/**
 * Coven task detail (#1031): what the shared suites cannot see. The dress
 * renders, the retired voice stays gone (ADR-0057), no literal colour escapes
 * index.css, no roster, no `/praxis?task_id=` link. Static render, so only the
 * desktop size set is reachable.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import CovenTaskDetail from "../archetypes/CovenTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import i18n from "../../../i18n";
import { aTask } from '../../../test/fixtures'

/** The stamp's unit word (#2554); caps are CSS (#2598). 18 → plural. */
const POINTS_UNIT = i18n.t("praxis:card.stamp.points", { count: 18 });


const TASK = aTask({
  id: 305,
  title: "Brew comfort for a weary friend",
  description: "Put the kettle on for someone tired.",
  point_value: 120,
  level_required: 3,
  created_by: 31,
  primary_faction_slug: "coven",
  in_progress_count: 9,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "coven",
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
    slotsOpen: 4,
    maxTaskSlots: 13,
    basePoints: 120,
    factionMultiplier: 1.0,
    modifiedPoints: 120,
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

describe("Coven task detail — the dress", () => {
  it("draws the slip sheet, the braid, the wheel and the ward's flicker", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    // Classes owned by index.css. The negative is load-bearing (#2135): the
    // old backdrop class is still live on the mobile field desk.
    expect(html, "the slip sheet").toContain("--faction-coven-slip-from");
    expect(html, "the ward wash is gone from this column").not.toContain("coven-candle-backdrop");
    expect(html, "braided thread rules").toContain("cvn-braid");
    expect(html, "turning pentagram watermark").toContain("cvn-wheel");
    // `.cvn-candle` left with the ward (#2554); still live on CovenPraxisDetail.
  });

  it("speaks in the faction's four faces, all via tokens", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    expect(html, "Grenze Gotisch — display").toContain("--font-faction-witch");
    expect(html, "Spectral — numerals + brief").toContain("--font-faction-spectral");
    expect(html, "Caveat — the hand").toContain("--font-faction-script");
    expect(html, "Caveat — chrome (the hand too)").toContain("--font-faction-script");
  });

  it("paints with tokens only — no literal colour survives into the markup", () => {
    const { html } = render(<CovenTaskDetail state={baseState({ canSignUp: true })} />);
    const painted = [...html.matchAll(/(?:style|fill|stroke)="([^"]*)"/g)].map((m) => m[1]);
    expect(painted.filter((value) => /#[0-9a-f]{3}/i.test(value))).toEqual([]);
  });

  it("keeps slip-deep off body-sized text — it is a rule, a strand and a large numeral (#1295)", () => {
    // Tier note in `covenSlip.tsx`: slip-deep clears only the 3:1 large-text
    // floor on the ward page. Pairings exist only once rendered.
    const { html } = render(<CovenTaskDetail state={baseState({ canSignUp: true })} />);
    const inDeep = [...html.matchAll(/style="([^"]*)"/g)]
      .map((match) => match[1])
      .filter((style) => /(?:^|;)color:var\(--faction-coven-slip-deep\)/.test(style));
    for (const style of inDeep) {
      expect(style, "slip-deep carries only LARGE display type here").toMatch(
        /font-size:var\(--text-(title|heading|display)\)/,
      );
    }
  });
});

/* The ward geometry suite (#2237) went with the ward (#2554); the replacing
   mark is guarded in `covenScoreStamp.test.tsx`. */

describe("Coven task detail — the copy", () => {
  it("uses the shared neutral headings, not Coven's retired detail voice", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // Retired `tasks:coven.*` voice (ADR-0057).
    for (const retired of [
      "spells cast",
      "the party",
      "most loved",
      "whimsy.exe",
      "sparks",
      "the love so far",
    ]) {
      expect(text.toLowerCase(), `retired voice: ${retired}`).not.toContain(retired);
    }
  });

  it("renders the author byline and the two header stats", () => {
    const { html, text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("Wren Abalone");
    expect(text).toContain("author · lvl 4");
    expect(html).toContain('href="/characters/31"');
    expect(text).toContain("Level");
    expect(text).toContain("people working on this");
  });

  it("draws the brief in full — no clamp, no truncation", () => {
    const long = "x".repeat(2000);
    const { text } = render(
      <CovenTaskDetail state={baseState({ task: { ...TASK, description: long } })} />,
    );
    expect(text).toContain(long);
  });
});

describe("Coven task detail — the contract", () => {
  it("hides the multiplier badge at the identity factor", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).not.toContain("×");
  });

  it("shows the raw factor once an era ships a real one, beside base and total", () => {
    const { text } = render(
      <CovenTaskDetail state={baseState({ factionMultiplier: 1.5, modifiedPoints: 180 })} />,
    );
    expect(text).toContain("×1.50");
    expect(text, "base still legible").toContain("120");
    expect(text, "the cauldron carries the total").toContain("180");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
    expect(text).toContain("9");
  });

  it("never links to the filterless praxis feed", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });

  it("shows no action cell at all when the viewer has no move to make", () => {
    const { text } = render(<CovenTaskDetail state={baseState({ canSignUp: false })} />);
    // The worth cell is a fact, not a control, so it stays.
    expect(text).toContain(POINTS_UNIT);
    expect(text).not.toContain("Sign up");
    expect(text).not.toContain("Continue editing");
  });
});
