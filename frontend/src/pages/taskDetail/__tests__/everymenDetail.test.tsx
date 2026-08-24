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
 *     did not survive the rebuild, and its retired copy did not either. Since
 *     #1262 the state carries no `signups` at all, so the structural half of the
 *     guard lives in `detailContract.test.tsx`.
 *  3. The `×mult` badge exists only off a non-identity factor (ADR-0055), and
 *     base and total stay separately legible either way (ADR-0053's
 *     dead-arithmetic trap is reconstructing one from the other).
 *  4. The gallery's "view all" expands IN PLACE. The old build linked out to
 *     `/praxis?task_id=N`, which showed the whole feed — the praxis feed read no
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
import i18n from "../../../i18n";
import type { PraxisCardOut } from "../../../api/praxis";
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
    // ADR-0057: `tasks:everymen.*` was deleted by #1068's sweep, so these are no
    // longer reachable from a catalog — a regression has to retype them.
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
    // The wage box stays; an unusable control is worse than none. Anchored on
    // the stamped total rather than the `base` eyebrow: #1704 drops that row at
    // the identity multiplier, so the total is what "the box is still here"
    // looks like today.
    expect(text.toLowerCase()).toContain(POINTS_UNIT);
    expect(text).not.toContain("Sign up");
  });
});
