/**
 * The shared task-detail contract (#1030) — the parts C1–C8 inherit.
 *
 * `archetypeSlots.test.tsx` guards the content slots every skin must draw.
 * This file guards the three contract decisions that are easy to get wrong once
 * eight skins copy the na reference implementation:
 *
 *  1. **Comments live inside the archetype now**, gated on `status === "active"`.
 *     The dispatcher stopped rendering `<CommentThread>`, so a skin that forgets
 *     the shared slot silently loses the thread. Anchored on the thread's
 *     "Loading…" state, which is what a static render always produces (the
 *     harness runs no effects).
 *  2. **The `×mult` badge only exists off the identity multiplier.** `era_1`
 *     neutralises every faction to 1.0, so the badge must be absent today and
 *     appear on its own the day an era ships a real modifier — without anyone
 *     reconstructing the ratio from `modifiedPoints / basePoints` (ADR-0053's
 *     dead-arithmetic trap, ADR-0055's rule).
 *  3. **No skin renders an in-progress roster — and no skin *can*.** Owner
 *     ruling 2026-07-28, reversing epic #1028 decision 3: the header count is
 *     the only place that population appears. #1262 then took `signups` off
 *     `TaskDetailState` altogether, because the hook was fetching
 *     `GET /tasks/{id}/signups` on every task-detail load and discarding the
 *     parsed response. The guard is structural now rather than textual: the
 *     roster has no source. Re-adding the slot re-adds the round trip, so it
 *     wants a `needs-design` issue for the surface that would read it.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";

/** The comment thread's pre-fetch state — present iff the thread mounted. */
const THREAD_ANCHOR = "loading…";

const TASK: TaskOut = {
  id: 207,
  title: "A Very Human Thing",
  description: "Make something small and honest.",
  point_value: 18,
  level_required: 2,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: null,
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 6,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: null,
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
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 18,
    factionMultiplier: 1.0,
    modifiedPoints: 18,
    inProgressCount: 6,
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

const archetypes = { ...surfaceMap("taskDetail"), __default__: DefaultTaskDetail };

describe("task-detail comments slot", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} mounts the comment thread on an active task`, () => {
      const { text } = render(<Archetype state={baseState()} />);
      expect(text.toLowerCase()).toContain(THREAD_ANCHOR);
    });

    it(`${slug} drops the comment thread once the task is not active`, () => {
      const { text } = render(
        <Archetype state={baseState({ task: { ...TASK, status: "archived" } })} />,
      );
      expect(text.toLowerCase()).not.toContain(THREAD_ANCHOR);
    });
  }
});

/**
 * The action column's width follows `hasAction` (#1138).
 *
 * Each skin pins its own panel width on desktop — 420 (Ephemerists) to 520
 * (Everymen) — and every one of the nine pinned it *unconditionally*, while the
 * action cell inside was correctly gated. A logged-out viewer therefore got a
 * frame sized for a control that was not rendered.
 *
 * The assertion is deliberately derived rather than hardcoded: whatever
 * three-digit width a skin pins when there IS a move must be gone when there is
 * not. That way a tenth skin, or a re-dressed panel width, is covered without
 * this file learning any faction's number. The band floor keeps the check off
 * the skins' small ornament widths (medallions, ledgers, avatar discs).
 */
const PANEL_BAND_FLOOR = 400;

/** Inline `width:` declarations only — `min-width` is a floor, not a pin. */
function pinnedWidths(html: string): number[] {
  return [...html.matchAll(/[;"]width:(\d{3})px/g)]
    .map(([, value]) => Number(value))
    .filter((value) => value >= PANEL_BAND_FLOOR);
}

describe("task-detail action column", () => {
  const noMove = { canSignUp: false, isInProgress: false, inProgressPraxisId: null };

  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} pins its panel width while the viewer has a move`, () => {
      const { html } = render(<Archetype state={baseState()} />);
      expect(pinnedWidths(html).length).toBeGreaterThan(0);
    });

    it(`${slug} drops the pinned width once there is no action to hold`, () => {
      const { html } = render(<Archetype state={baseState(noMove)} />);
      expect(pinnedWidths(html)).toEqual([]);
    });
  }
});

describe("na / Default task detail — the reference anatomy", () => {
  it("hides the multiplier badge at the identity factor", () => {
    const { text } = render(<DefaultTaskDetail state={baseState()} />);
    expect(text).not.toContain("×");
  });

  it("shows the raw multiplier badge once an era ships a real factor", () => {
    const { text } = render(
      <DefaultTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 23 })}
      />,
    );
    expect(text).toContain("×1.25");
    // Base and total are both legible; the badge is not a substitute for either.
    expect(text).toContain("18");
    expect(text).toContain("23");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<DefaultTaskDetail state={baseState()} />);
    expect(text).toContain("In progress");
    expect(text).toContain("6");
  });

  /**
   * #1262 — the roster is unrenderable, not merely unrendered.
   *
   * The runtime half pins that the shared fixture stopped carrying `signups`.
   * The `@ts-expect-error` half is the real guard and `tsc` is its runner: it
   * fails the build the day `signups` comes back onto `TaskDetailState`, which
   * is the day the discarded `GET /tasks/{id}/signups` round trip comes back
   * with it. (The route itself survives — owner ruling; it is the *fetch* that
   * had no consumer.)
   */
  it("carries no roster on the state contract", () => {
    expect(baseState()).not.toHaveProperty("signups");
    // @ts-expect-error `signups` is not part of TaskDetailState.
    baseState({ signups: [] });
  });

  it("renders the author byline from the task's denormalised fields", () => {
    const { html, text } = render(<DefaultTaskDetail state={baseState()} />);
    expect(text).toContain("Wren Abalone");
    expect(text).toContain("author · lvl 4");
    expect(html).toContain('href="/characters/31"');
  });

  it("draws the brief in full — no clamp, no truncation", () => {
    const long = "x".repeat(2000);
    const { text } = render(
      <DefaultTaskDetail
        state={baseState({ task: { ...TASK, description: long } })} />,
    );
    expect(text).toContain(long);
  });

  it("speaks the shared neutral copy, not the retired na voice", () => {
    const { text } = render(<DefaultTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    // ADR-0057: the old na-voiced headings are gone from this surface.
    expect(text).not.toContain("The brief");
    expect(text).not.toContain("What people filed");
    expect(text).not.toContain("counts for everyone");
  });
});
