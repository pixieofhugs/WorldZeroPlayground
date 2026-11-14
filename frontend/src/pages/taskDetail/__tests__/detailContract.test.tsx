/**
 * The shared task-detail contract (#1030), run across every skin. Content slots
 * are in `archetypeSlots.test.tsx`. Comments live inside the archetype (gated on
 * `status === "active"`), anchored on the thread's "Loading…" state since no
 * effects run. No roster: `signups` is off `TaskDetailState` (#1262).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import i18n from "../../../i18n";
import type { CommentOut } from "../../../api/comments";
import { aTask } from '../../../test/fixtures'

/**
 * The worth unit word, from the stamp's catalog (#2554). Caps are CSS (#2598),
 * and Albescent's ring reads `tasks:detail.points.total`, differing only in case,
 * so haystacks below are lowered. 18 = `modifiedPoints`, hence plural.
 */
const POINTS_UNIT = i18n.t("praxis:card.stamp.points", { count: 18 });


/** Present iff the thread mounted. */
const THREAD_ANCHOR = "loading…";

const TASK = aTask({
  id: 207,
  title: "A Very Human Thing",
  description: "Make something small and honest.",
  created_by: 31,
  in_progress_count: 6,
  created_by_display_name: "Wren Abalone",
  created_by_level: 4,
});

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: null,
  task_id: 207,
  body_text: "seedlings along the estuary",
  is_edited: false,
  created_at: "2026-01-04T00:00:00Z",
  updated_at: "2026-01-04T00:00:00Z",
  author: {
    id: 42,
    username: "ada",
    display_name: "Adabel",
    avatar_url: "",
    faction_slug: "na",
  },
  mentions: [],
};

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    comments: null,
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
    dropConfirm: null,
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
        <Archetype state={baseState({ task: { ...TASK, status: "retired" } })} />,
      );
      expect(text.toLowerCase()).not.toContain(THREAD_ANCHOR);
    });

    it(`${slug} feeds the thread the rows the PAGE fetched`, () => {
      // #1281: no effects run here, so a row can only come from the page's fetch.
      const { text } = render(<Archetype state={baseState({ comments: [COMMENT] })} />);
      expect(text, "the page's rows").toContain(COMMENT.body_text);
      expect(text.toLowerCase(), "nothing left to wait for").not.toContain(THREAD_ANCHOR);
    });
  }
});

/**
 * The action column's width follows `hasAction` (#1138). Derived, not
 * hardcoded: any 3-digit pinned width present with a move must vanish without
 * one. The floor skips small ornament widths.
 */
const PANEL_BAND_FLOOR = 400;

/** Inline `width:` only; `min-width` is a floor, not a pin. */
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

/**
 * Controls that exist only when they say something (#1704): no sort toggle over
 * an empty gallery; no `base` row restating the total at ×1.0 (ADR-0053).
 */
const SORT_LABELS = ["Top rated", "Recent"];

/**
 * Bare substring: skins run it into the numeral (`base18`), defeating `\b`.
 * Case-folded because Albescent reads "Base" and the stamp reads "base"; one
 * casing would let the other slip past the negative assertion.
 */
const BASE_ROW = "base";

describe("task-detail gallery sort toggle", () => {
  const ONE_PRAXIS = [
    { id: 3, task_id: 207, created_by_id: 42, score: 4, created_at: "2026-02-02T00:00:00Z" },
  ] as unknown as TaskDetailState["sortedSubmissions"];

  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} draws no sort toggle over an empty gallery`, () => {
      const { text } = render(<Archetype state={baseState()} />);
      for (const label of SORT_LABELS) expect(text).not.toContain(label);
      expect(text).toContain("No praxis submitted yet");
    });

    it(`${slug} draws the sort toggle once there is praxis to sort`, () => {
      const { text } = render(
        <Archetype
          state={baseState({ submissions: ONE_PRAXIS, sortedSubmissions: ONE_PRAXIS })}
        />,
      );
      for (const label of SORT_LABELS) expect(text).toContain(label);
    });
  }
});

describe("task-detail worth readout", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} drops the base row when it would restate the total`, () => {
      const { text } = render(<Archetype state={baseState()} />);
      expect(text.toLowerCase()).not.toContain(BASE_ROW);
      expect(text).toContain("18");
      expect(text.toLowerCase()).toContain(POINTS_UNIT);
    });

    it(`${slug} keeps base, chip and total once a factor is real`, () => {
      const { text } = render(
        <Archetype state={baseState({ factionMultiplier: 1.25, modifiedPoints: 23 })} />,
      );
      expect(text.toLowerCase()).toContain(BASE_ROW);
      expect(text).toContain("×1.25");
      expect(text).toContain("18");
      expect(text).toContain("23");
    });
  }
});

describe("na / Default task detail — the state contract", () => {
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
    // @ts-expect-error `signups` is not part of TaskDetailState.
    baseState({ signups: [] });
  });
});

/** Reference-anatomy invariants across all nine skins (#2812). */
describe("task-detail header population", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the in-progress population as a header count`, () => {
      const { text } = render(<Archetype state={baseState()} />);
      expect(text).toContain("people working on this");
      expect(text).toContain("6");
    });
  }
});

describe("task-detail multiplier badge", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    // `/×\d/`: Ephemerists rune strips carry a bare ornamental `×`.
    it(`${slug} hides the multiplier badge at the identity factor`, () => {
      const { text } = render(<Archetype state={baseState()} />);
      expect(text).not.toMatch(/×\d/);
    });

    it(`${slug} shows the raw multiplier badge once an era ships a real factor`, () => {
      const { text } = render(
        <Archetype state={baseState({ factionMultiplier: 1.25, modifiedPoints: 23 })} />,
      );
      expect(text).toContain("×1.25");
      expect(text).toContain("18");
      expect(text).toContain("23");
    });
  }
});

describe("task-detail author byline", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders the author byline from the task's denormalised fields`, () => {
      const { html, text } = render(<Archetype state={baseState()} />);
      expect(text).toContain("Wren Abalone");
      expect(text).toContain("author · lvl 4");
      expect(html).toContain('href="/characters/31"');
    });
  }
});

describe("task-detail brief", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} draws the brief in full — no clamp, no truncation`, () => {
      const long = "x".repeat(2000);
      const { text } = render(
        <Archetype state={baseState({ task: { ...TASK, description: long } })} />,
      );
      expect(text).toContain(long);
    });
  }
});

describe("task-detail shared neutral copy", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} speaks the shared neutral copy`, () => {
      const { text } = render(<Archetype state={baseState()} />);
      expect(text).toContain("Task Description");
      expect(text).toContain("Discussion");
    });
  }
});

/**
 * Reading order (#2120): title · description · byline/level/headcount · panel.
 * Set by DOM order, so asserting on markup pins both form factors at once.
 */
describe("task-detail reading order", () => {
  /** An absent anchor fails by name rather than as `-1 < n`. */
  function at(text: string, needle: string): number {
    const index = text.indexOf(needle);
    expect(index, `missing anchor: ${needle}`).toBeGreaterThanOrEqual(0);
    return index;
  }

  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} runs title, description, who-and-level, then the panel`, () => {
      const { text } = render(<Archetype state={baseState()} />);
      const title = at(text, TASK.title);
      const description = at(text, "Make something small and honest.");
      const byline = at(text, "Wren Abalone");
      const headcount = at(text, "people working on this");
      // Lowered (see POINTS_UNIT); `toLowerCase` keeps length, so indices hold.
      const panel = at(text.toLowerCase(), POINTS_UNIT);

      expect(title, "description after the title").toBeLessThan(description);
      expect(description, "byline after the description").toBeLessThan(byline);
      expect(byline, "headcount after the byline").toBeLessThan(headcount);
      expect(headcount, "panel after the headcount").toBeLessThan(panel);
    });
  }
});
