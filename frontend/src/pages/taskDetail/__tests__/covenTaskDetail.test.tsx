/**
 * Coven task detail — THE CANDLELIT WARD (#1031).
 *
 * `archetypeSlots` already guards the content slots and `detailContract` the
 * comments gate, for every registered skin. This file guards what is specific
 * to the Coven rebuild and would otherwise regress silently:
 *
 *  1. **The dress actually renders.** A skin can pass tsc, eslint and both
 *     shared suites while drawing none of its ornament — the ward, the braid,
 *     the wheel and the haze are the whole point of the archetype.
 *  2. **The voice is gone.** ADR-0057: this surface carries the shared neutral
 *     copy only. #1068's per-key sweep deleted the retired `tasks:coven.*`
 *     detail strings outright — #1039 had kept them for faction pages that turn
 *     out to read `factions:` — so creeping back now means retyping the copy.
 *     This is what would notice.
 *  3. **No colour escapes index.css.** Every pigment on this skin is a token;
 *     a literal hex in a style/fill/stroke is a dark-mode bug that renders fine.
 *  4. **No in-progress roster** (owner ruling 2026-07-28) and **no dead
 *     `/praxis?task_id=` link** (the gallery expands in place instead).
 *
 * The harness is `renderToStaticMarkup` — no DOM, no effects. `useFormFactor`
 * therefore always reports its server default, so only the DESKTOP size set is
 * reachable here; the mobile column collapse is eyeball-only.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import CovenTaskDetail from "../archetypes/CovenTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";

const TASK: TaskOut = {
  id: 305,
  title: "Brew comfort for a weary friend",
  description: "Put the kettle on for someone tired.",
  point_value: 120,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: "coven",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 9,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "coven",
  created_by_level: 4,
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

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
    ...overrides,
  };
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

describe("Coven task detail — the dress", () => {
  it("draws the candlelight haze, the braid, the wheel and the ward's flicker", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    // Each of these classes is owned by index.css, which is where the light/dark
    // flip and the reduced-motion guard live.
    expect(html, "candlelight backdrop").toContain("coven-candle-backdrop");
    expect(html, "braided thread rules").toContain("cvn-braid");
    expect(html, "turning pentagram watermark").toContain("cvn-wheel");
    expect(html, "the ward's breathing aura").toContain("cvn-candle");
  });

  it("speaks in the faction's four faces, all via tokens", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    expect(html, "Grenze Gotisch — display").toContain("--font-faction-witch");
    expect(html, "Cormorant Garamond — numerals + brief").toContain("--font-faction-serif");
    expect(html, "Caveat — the hand").toContain("--font-faction-script");
    expect(html, "Quicksand — chrome").toContain("--font-faction-rounded");
  });

  it("paints with tokens only — no literal colour survives into the markup", () => {
    const { html } = render(<CovenTaskDetail state={baseState({ canSignUp: true })} />);
    const painted = [...html.matchAll(/(?:style|fill|stroke)="([^"]*)"/g)].map((m) => m[1]);
    expect(painted.filter((value) => /#[0-9a-f]{3}/i.test(value))).toEqual([]);
  });

  it("keeps slip-deep off body-sized text — it is a rule, a strand and a large numeral (#1295)", () => {
    // The tier note lives in `components/cards/covenSlip.tsx`. `slip-deep`
    // measures 4.44:1 on the ward PAGE (3.47:1 under the peak of the pink haze
    // bloom) and 4.70:1 on the ward CARD, so it may carry words only at a size
    // the 3:1 large-text floor covers. Neither guard above sees this: the token
    // test measures declared values, and an ink-to-ground PAIRING exists only
    // once rendered. The breadcrumb and the "level met" note both sit on the
    // PAGE, and both wore it.
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

describe("Coven task detail — the copy", () => {
  it("uses the shared neutral headings, not Coven's retired detail voice", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // The archetype this replaces spoke all of these. #1068's per-key sweep
    // found nothing left reading `tasks:coven.*` and deleted the namespace, so
    // drifting back now means re-adding the copy — which is what this catches
    // (ADR-0057).
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
    expect(text).toContain("In progress");
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
    expect(text, "the ward carries the total").toContain("180");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<CovenTaskDetail state={baseState()} />);
    expect(text).toContain("In progress");
    expect(text).toContain("9");
  });

  it("never links to the filterless praxis feed", () => {
    const { html } = render(<CovenTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });

  it("shows no action cell at all when the viewer has no move to make", () => {
    const { text } = render(<CovenTaskDetail state={baseState({ canSignUp: false })} />);
    // The worth cell survives — it is a fact about the task, not a control.
    expect(text).toContain("POINTS");
    expect(text).not.toContain("Sign up");
    expect(text).not.toContain("Continue editing");
  });
});
