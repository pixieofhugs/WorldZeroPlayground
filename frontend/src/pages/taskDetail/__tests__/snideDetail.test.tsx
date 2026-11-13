/**
 * S.N.I.D.E. task detail (#1035): what a "faithful to the design" edit would
 * undo. The censor never redacts the brief (#1023); the cut-up headline is
 * inline flow, not flex, so its accessible name keeps its spaces; the retired
 * case-file voice stays gone (ADR-0057).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import SnideTaskDetail from "../archetypes/SnideTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aTask } from '../../../test/fixtures'

/** Deliberately multi-word: the headline cuts one word per <span>. */
const TITLE = "Name the thing everyone is pretending not to notice";
const BRIEF =
  "Write it down, photograph the evidence, and post it before anyone can talk you out of it.";

const TASK = aTask({
  id: 305,
  title: TITLE,
  description: BRIEF,
  point_value: 120,
  level_required: 3,
  created_by: 31,
  primary_faction_slug: "snide",
  in_progress_count: 9,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "snide",
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

describe("SNIDE task detail — the ransom dossier", () => {
  it("prints the brief whole — the censor redacts ornament, never content", () => {
    const { html, text } = render(<SnideTaskDetail state={baseState()} />);
    expect(text).toContain(BRIEF);
    // The censor survives as a decorative rule.
    expect(html).toContain("snd-censor");
    expect(html).not.toContain("color:transparent");
  });

  it("heads sections with the censor rule and closes no box with it", () => {
    const { html } = render(<SnideTaskDetail state={baseState()} />);
    // One per section head, none closing the brief panel (#1145).
    expect(html.split("snd-censor").length - 1).toBe(3);
    const afterBrief = html.slice(html.indexOf(BRIEF) + BRIEF.length);
    expect(afterBrief.indexOf("snd-censor")).toBeGreaterThan(
      afterBrief.indexOf("completed praxis"),
    );
  });

  it("keeps the cut-up headline one readable string", () => {
    const { html, text } = render(<SnideTaskDetail state={baseState()} />);
    expect(html).toContain("--faction-snide-font-black");
    expect(html).toContain("--faction-snide-font-type");
    expect(html).toContain("--faction-snide-note-knockout-bg");
    expect(text).toContain(TITLE);
  });

  it("prints every clipping as the black slab, inked out of -card-* (#2066)", () => {
    // Sheets are the theme-invariant slab, so no flipping ink may sit on them.
    const { html } = render(<SnideTaskDetail state={baseState()} />);
    expect(html, "the stock has no consumer left on this page").not.toContain(
      "--faction-snide-note-paper",
    );
    expect(html, "and the slab is what replaced it").toContain("--faction-snide-card-bg");
    // Pink fails contrast on the slab (3.13:1); this fixture has no wall line.
    expect(html, "no walked pink ink survives on the slab").not.toMatch(
      /color:var\(--faction-snide-note-pink-ink\)/,
    );
  });

  it("hangs the praxis gallery's own hook, so its cards are black too (#2177)", () => {
    // The column is already the wall, so the row resets `--snd-praxis-*` to the
    // slab. Own class: every task-detail archetype mounts `.praxis-gallery`. Other end:
    // `snideOneGround.test.tsx`.
    const filed = {
      id: 91,
      task_id: TASK.id,
      task_title: TITLE,
      task_faction_slug: "snide",
      title: "Posted it at the depot gate",
      created_by_id: 31,
      created_by_display_name: "Wren Abalone",
      score: 12,
      media_items: [],
      applied_metatasks: [],
    } as unknown as TaskDetailState["submissions"][number];
    const { html } = render(
      <SnideTaskDetail state={baseState({ submissions: [filed], sortedSubmissions: [filed] })} />,
    );
    expect(html).toContain("praxis-gallery snd-detail-praxis");
  });

  it("speaks the shared neutral copy, not the retired case-file voice", () => {
    const { text } = render(<SnideTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    expect(text).toContain("S.N.I.D.E.");
    for (const retired of ["Case file", "Accomplices", "Verdict", "Top marks"]) {
      expect(text.toLowerCase()).not.toContain(retired.toLowerCase());
    }
  });

  it("hides the multiplier at the identity factor and shows the raw one otherwise", () => {
    expect(render(<SnideTaskDetail state={baseState()} />).text).not.toContain("×");
    const { text } = render(
      <SnideTaskDetail
        state={baseState({ factionMultiplier: 1.5, modifiedPoints: 180 })}
      />,
    );
    expect(text).toContain("×1.50");
    expect(text).toContain("120");
    expect(text).toContain("180");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<SnideTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
    expect(text).toContain("9");
  });

  it("bylines the author and links the character, not the account", () => {
    const { html, text } = render(<SnideTaskDetail state={baseState()} />);
    expect(text).toContain("Wren Abalone");
    expect(text).toContain("author · lvl 4");
    expect(html).toContain('href="/characters/31"');
  });
});
