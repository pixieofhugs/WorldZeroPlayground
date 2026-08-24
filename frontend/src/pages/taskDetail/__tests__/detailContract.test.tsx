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
import i18n from "../../../i18n";
import type { CommentOut } from "../../../api/comments";
import { aTask } from '../../../test/fixtures'

/**
 * The worth panel's unit word, read from the catalog rather than typed.
 *
 * It used to be the literal "POINTS". #2598 moved the shout out of the catalog
 * value and into CSS — the catalog holds "Point"/"Points" and each of the nine
 * skins uppercases the element that draws it — so a STATIC render now reads the
 * catalog's case, while a browser still paints caps. Same move, and the same
 * reason, as `everymenBillOrnament.test.tsx`'s struck seal.
 *
 * 18 is `modifiedPoints` in every state below, so this is the plural.
 */
/**
 * THE KEY MOVED IN #2554. The worth cell is the faction's own `ScoreStamp`
 * now, not a second readout each page draws, so the unit is the stamp's
 * shared `praxis:card.stamp.points` — lower case, because that catalog was
 * never shouted. `tasks:detail.points.total` survives on Albescent alone,
 * whose prism ring overrides the cell; it differs only in case, which is
 * why the haystacks below are lowered rather than the anchor forked.
 */
const POINTS_UNIT = i18n.t("praxis:card.stamp.points", { count: 18 });


/** The comment thread's pre-fetch state — present iff the thread mounted. */
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

/** One row the page fetched alongside the task (#1281). */
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

    // `retired`, not `archived` — the latter is not a `TaskStatus` and never
    // was. It only compiled because the hand-written mirror spelled `status`
    // as a bare `string`; the generated type is the three-value enum (#1400).
    it(`${slug} drops the comment thread once the task is not active`, () => {
      const { text } = render(
        <Archetype state={baseState({ task: { ...TASK, status: "retired" } })} />,
      );
      expect(text.toLowerCase()).not.toContain(THREAD_ANCHOR);
    });

    it(`${slug} feeds the thread the rows the PAGE fetched`, () => {
      // #1281: the `status === "active"` gate above unmounts the thread, so its
      // own effect could not start until the task had landed — comments were
      // always a round trip late. `useTaskDetail` now fetches them in the same
      // batch as the task and the shared slot seeds the thread. No effects run
      // here, so a row in this markup can only be the page's own fetch.
      const { text } = render(<Archetype state={baseState({ comments: [COMMENT] })} />);
      expect(text, "the page's rows").toContain(COMMENT.body_text);
      expect(text.toLowerCase(), "nothing left to wait for").not.toContain(THREAD_ANCHOR);
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

/**
 * Two controls that only exist when they say something (#1704) — CLAUDE.md's
 * "hide unusable controls" doctrine, checked across every skin because all nine
 * copied the na reference.
 *
 *  1. **The gallery sort toggle needs something to sort.** Every skin drew
 *     `Top rated | Recent` in the gallery head unconditionally and tested
 *     `sortedSubmissions.length === 0` only for the body below it, so a task
 *     with no praxis offered a sort over nothing.
 *  2. **The `base` row must not restate the total.** ADR-0049 / ADR-0053's row
 *     policy, already applied to the praxis stamp by `scoreBreakdown.ts`
 *     (#1131): at the identity multiplier `base 18` and `18 POINTS` are the same
 *     number twice. The row and its `×mult` chip drop as one unit.
 */
const SORT_LABELS = ["Top rated", "Recent"];

/**
 * The `base` eyebrow — the row's only text. Matched as a bare substring on
 * purpose: the skins run it straight into its numeral (`base18`, `base 18`), so
 * a `\b`-anchored regex matches neither, and no other copy on this page carries
 * the word.
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
      // The heading and the empty line stay — only the control goes.
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
      expect(text).not.toContain(BASE_ROW);
      expect(text).toContain("18");
      expect(text.toLowerCase()).toContain(POINTS_UNIT);
    });

    it(`${slug} keeps base, chip and total once a factor is real`, () => {
      const { text } = render(
        <Archetype state={baseState({ factionMultiplier: 1.25, modifiedPoints: 23 })} />,
      );
      expect(text).toContain(BASE_ROW);
      expect(text).toContain("×1.25");
      expect(text).toContain("18");
      expect(text).toContain("23");
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
    expect(text).toContain("people working on this");
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

/**
 * The page's reading order (#2120) — one sequence, both form factors.
 *
 * Owner ruling: title and description answer *what is this*; byline, level and
 * headcount answer *can I, and who else*; the points-and-signup panel answers
 * *do I*. The page runs in that order:
 *
 *     breadcrumb · title · description · author/level/headcount · panel
 *
 * The seam is DOM order, not CSS. Every skin lays its header and its action
 * column out as flex siblings with `flexDirection: desktop ? "row" : "column"`,
 * so on mobile the DOM order IS the reading order — which is how the whole panel
 * came to sit between the title and the description — while on desktop the same
 * DOM reads down the left column with the panel beside it. Asserting on the
 * markup therefore pins both form factors at once, which is what the ruling asks
 * for: a page whose order depends on width comes back as its own bug report.
 *
 * Anchored on shared neutral copy (ADR-0057) and fixture values, so a skin that
 * re-dresses its labels still passes and a skin that re-sequences fails.
 */
describe("task-detail reading order", () => {
  /** First occurrence; an absent anchor fails by name rather than as `-1 < n`. */
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
      // Lowered, not re-anchored: the case is the only difference between
      // the eight stamped skins and Albescent's ring, and `toLowerCase`
      // preserves length so the index still orders against the rest.
      const panel = at(text.toLowerCase(), POINTS_UNIT);

      expect(title, "description after the title").toBeLessThan(description);
      expect(description, "byline after the description").toBeLessThan(byline);
      expect(byline, "headcount after the byline").toBeLessThan(headcount);
      expect(headcount, "panel after the headcount").toBeLessThan(panel);
    });
  }
});
