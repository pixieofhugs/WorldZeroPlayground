/**
 * Everymen task detail (#1033): what the shared suites cannot see. The retired
 * union voice stays gone (ADR-0057), no roster (owner ruling 2026-07-28), the
 * `×mult` badge only off ×1.0 (ADR-0055), view-all expands in place, and the
 * broadsheet dress mounts. Static render, so this is the desktop skin.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import EverymenTaskDetail from "../archetypes/EverymenTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import i18n from "../../../i18n";
import type { PraxisCardOut } from "../../../api/praxis";
import { aTask } from '../../../test/fixtures'

/** The stamp's unit word (#2554); compared lowered, see detailContract. */
const POINTS_UNIT = i18n.t("praxis:card.stamp.points", { count: 18 });


const TASK = aTask({
  id: 207,
  title: "Organize a neighborhood tool library",
  description: "Pool what the block already owns and lend it out.",
  point_value: 45,
  level_required: 3,
  created_by: 31,
  primary_faction_slug: "everymen",
  in_progress_count: 23,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "everymen",
  created_by_level: 4,
});

/** One more than the gallery preview, so "view all" shows. */
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
  habit_bonus_points: 0,
  is_top_for_task: false,
  applied_metatasks: [],
  body_text: null,
  created_by_avatar_url: "",
  created_by_faction_slug: null,
  duel_id: null,
  media_items: [],
  members: [],
  opponent_display_name: null,
  opponent_faction_slug: null,
  opponent_avatar_url: "",
  opponent_praxis_id: null,
  submit_proposed_at: null,
  viewer_can_vote: true,
  viewer_vote: null,
  voted_by_name: null,
  task_faction_slug: "everymen",
}));

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
    dropConfirm: null,
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
    // ADR-0057: the retired `tasks:everymen.*` voice.
    expect(text).not.toContain("The Order");
    expect(text).not.toContain("Hands On The Job");
    expect(text).not.toContain("The Hall's Verdict");
    expect(text).not.toContain("Work Reports Filed");
    expect(text).not.toContain("Report for duty");
    expect(text).not.toContain("BEST IN HALL");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<EverymenTaskDetail state={baseState()} />);
    expect(text).not.toContain("on the job");
    expect(text).toContain("people working on this");
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
    expect(html).not.toContain("task_id=");
  });

  it("mounts the broadsheet dress: the sheet and the masthead", () => {
    const { html, text } = render(<EverymenTaskDetail state={baseState()} />);
    expect(html).toContain("em-broadsheet");
    expect(text).toContain("Everymen");
    // #1124 retired the `Task №{id}` crumb.
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
    // The wage box stays. Anchored on the total: #1704 drops `base` at ×1.0.
    expect(text.toLowerCase()).toContain(POINTS_UNIT);
    expect(text).not.toContain("Sign up");
  });
});
