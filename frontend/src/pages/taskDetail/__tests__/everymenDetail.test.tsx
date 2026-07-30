/**
 * Everymen task detail (C3, #1033) — the broadsheet rebuild.
 *
 * `archetypeSlots` already guards the content slots and `detailContract` guards
 * the comments slot for every registered skin, so this file only pins the things
 * that are specific to THIS rebuild and would otherwise regress silently:
 *
 *  1. The retired union voice is gone. #1068's per-key sweep deleted
 *     `tasks:everymen.*` outright — #1039 had kept it for faction pages that
 *     turn out to read `factions:` — so "The Order" / "Hands On The Job" /
 *     "Report for duty" would have to be retyped rather than merely re-reached
 *     for. ADR-0057: this surface speaks the shared neutral `detail.*` copy.
 *  2. No in-progress roster — owner ruling 2026-07-28. The 785-line predecessor
 *     drew a "Hands On The Job" avatar row off `signups`; this asserts the row
 *     did not survive the rebuild.
 *  3. The `×mult` badge exists only off a non-identity factor (ADR-0055), and
 *     base and total stay separately legible either way (ADR-0053's
 *     dead-arithmetic trap is reconstructing one from the other).
 *  4. The gallery's "view all" expands IN PLACE. The old build linked out to
 *     `/praxes?task_id=N`, which showed the whole feed — the praxis feed read no
 *     such param until #1050.
 *  5. The dress is actually mounted: the broadsheet backdrop class and the
 *     masthead's faction line.
 *
 * Harness: `renderToStaticMarkup`, no DOM, no effects. `useFormFactor` has no
 * `matchMedia` here and falls back to 'desktop', so this is the desktop skin.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import EverymenTaskDetail from "../archetypes/EverymenTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut, TaskSignupOut } from "../../../api/tasks";
import type { PraxisCardOut } from "../../../api/praxis";

const TASK: TaskOut = {
  id: 207,
  title: "Organize a neighborhood tool library",
  description: "Pool what the block already owns and lend it out.",
  point_value: 45,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: "everymen",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 23,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "everymen",
  created_by_level: 4,
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

const SIGNUP: TaskSignupOut = {
  character_id: 88,
  display_name: "Halden Voss",
  avatar_url: "",
  faction_slug: "everymen",
  level: 7,
  praxis_type: "solo",
  joined_at: "2026-01-03T00:00:00Z",
};

/** Four filed praxis — one more than the gallery preview, so "view all" shows. */
const PRAXIS: PraxisCardOut[] = [1, 2, 3, 4].map((n) => ({
  id: n,
  task_id: 207,
  task_title: TASK.title,
  task_point_value: 45,
  task_level_required: 3,
  type: "solo",
  status: "submitted",
  title: `Report ${n}`,
  moderation_status: "visible",
  created_by_id: 40 + n,
  created_by_display_name: `Hand ${n}`,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  submitted_at: "2026-01-02T00:00:00Z",
  member_count: 1,
  score: 5 - n,
  voter_count: 0,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
  is_top_for_task: false,
  task_faction_slug: "everymen",
}));

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    submissions: [],
    signups: [],
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 45,
    factionMultiplier: 1.0,
    modifiedPoints: 45,
    inProgressCount: 23,
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

describe("Everymen task detail — the broadsheet", () => {
  it("speaks the shared neutral copy, not the retired union voice", () => {
    const { text } = render(<EverymenTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // ADR-0057: `tasks:everymen.*` was deleted by #1068's sweep, so these are no
    // longer reachable from a catalog — a regression has to retype them.
    expect(text).not.toContain("The Order");
    expect(text).not.toContain("Hands On The Job");
    expect(text).not.toContain("The Hall's Verdict");
    expect(text).not.toContain("Work Reports Filed");
    expect(text).not.toContain("Report for duty");
    expect(text).not.toContain("BEST IN HALL");
  });

  it("renders no in-progress roster, only the header count", () => {
    const { text } = render(
      <EverymenTaskDetail state={baseState({ signups: [SIGNUP] })} />,
    );
    expect(text).not.toContain("Halden Voss");
    expect(text).not.toContain("on the job");
    expect(text).toContain("In progress");
    expect(text).toContain("23");
  });

  it("hides the multiplier badge at the identity factor", () => {
    const { text } = render(<EverymenTaskDetail state={baseState()} />);
    expect(text).not.toContain("×");
    expect(text).toContain("45");
  });

  it("shows the raw multiplier badge once an era ships a real factor", () => {
    const { text } = render(
      <EverymenTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 56 })}
      />,
    );
    expect(text).toContain("×1.25");
    // Base and stamped total are both legible; neither substitutes for the other.
    expect(text).toContain("45");
    expect(text).toContain("56");
  });

  it("expands the gallery in place instead of the dead task_id feed link", () => {
    const { html, text } = render(
      <EverymenTaskDetail
        state={baseState({ submissions: PRAXIS, sortedSubmissions: PRAXIS })}
      />,
    );
    expect(text).toContain("4 completed praxis");
    expect(text).toContain("View all 4 praxis");
    // The reader stays on the task; the old link went out to the feed.
    expect(html).not.toContain("task_id=");
  });

  it("mounts the broadsheet dress: the sheet and the masthead", () => {
    const { html, text } = render(<EverymenTaskDetail state={baseState()} />);
    expect(html).toContain("em-broadsheet");
    expect(text).toContain("Everymen");
    // The breadcrumb is the shared "Tasks" crumb and nothing after it: #1124
    // retired `Task №{id}`, which was the trail's whole second crumb.
    expect(text).toContain("Tasks");
    expect(text, "no task id in the breadcrumb").not.toContain("№");
  });

  it("renders the author byline from the task's denormalised fields", () => {
    const { html, text } = render(<EverymenTaskDetail state={baseState()} />);
    expect(text).toContain("Wren Abalone");
    expect(text).toContain("author · lvl 4");
    expect(html).toContain('href="/characters/31"');
  });

  it("draws the brief in full — no clamp, no truncation", () => {
    const long = "x".repeat(2000);
    const { text } = render(
      <EverymenTaskDetail
        state={baseState({ task: { ...TASK, description: long } })}
      />,
    );
    expect(text).toContain(long);
  });

  it("draws no action box when the viewer has no move to make", () => {
    const { text } = render(
      <EverymenTaskDetail state={baseState({ canSignUp: false })} />,
    );
    // The wage box stays; an unusable control is worse than none.
    expect(text).toContain("base");
    expect(text).not.toContain("Sign up");
  });
});
