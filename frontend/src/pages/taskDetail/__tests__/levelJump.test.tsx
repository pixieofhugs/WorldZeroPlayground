/**
 * Level-jump affordance (#816) — the three visual states, tested as pure
 * props-in/value-out (harness note: no DOM, effects never run, so the hook and
 * self-fetching page aren't testable; the predicate and the presentational
 * banner are).
 *
 * The predicate distinguishes:
 *   1. Reachable BECAUSE of the allowance  -> true  (distinct level-jump CTA)
 *   2. Spent                               -> false (CTA gone; reads as locked)
 *   3. Plain out of reach                  -> false (CTA gone; reads as locked)
 * driven entirely off level_jump_reach / level_jump_available / task level vs
 * viewer level — never a slug comparison.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n"; // initialise i18next with the real catalogs (throws on a missing key)
import { isLevelJumpSignup } from "../levelJump";
import { LevelJumpBanner } from "../archetypes/shared";
import type { TaskDetailState } from "../useTaskDetail";
import { aTask } from '../../../test/fixtures'

const TASK_ABOVE = aTask({
  id: 1,
  title: "Knight a houseplant",
  point_value: 20,
  level_required: 4, // one above a level-3 viewer,
  created_by: 1,
  primary_faction_slug: "snide",
  created_by_display_name: "",
});

describe("isLevelJumpSignup — the three states", () => {
  it("state 1: reachable BECAUSE of the allowance -> true", () => {
    expect(
      isLevelJumpSignup({
        canSignUp: true,
        levelJumpReach: 1,
        levelJumpAvailable: true,
        taskLevelRequired: 4,
        viewerLevel: 3,
      }),
    ).toBe(true);
  });

  it("state 2: spent (allowance unavailable -> backend denies -> canSignUp false) -> false", () => {
    // Once spent, the backend's can_sign_up is false, so canSignUp is
    // false and the flag never fires — the task reads as locked.
    expect(
      isLevelJumpSignup({
        canSignUp: false,
        levelJumpReach: 1,
        levelJumpAvailable: false,
        taskLevelRequired: 4,
        viewerLevel: 3,
      }),
    ).toBe(false);
  });

  it("state 3: plain out of reach (more than reach above level) -> false", () => {
    expect(
      isLevelJumpSignup({
        canSignUp: false, // backend denies: task is 2 above a reach-1 viewer
        levelJumpReach: 1,
        levelJumpAvailable: true,
        taskLevelRequired: 5,
        viewerLevel: 3,
      }),
    ).toBe(false);
  });

  it("no ability (reach 0) -> false even for a signable above-level task", () => {
    expect(
      isLevelJumpSignup({
        canSignUp: true,
        levelJumpReach: 0,
        levelJumpAvailable: false,
        taskLevelRequired: 4,
        viewerLevel: 3,
      }),
    ).toBe(false);
  });

  it("ordinary at-or-below-level signup is not a level-jump", () => {
    expect(
      isLevelJumpSignup({
        canSignUp: true,
        levelJumpReach: 1,
        levelJumpAvailable: true,
        taskLevelRequired: 3,
        viewerLevel: 3,
      }),
    ).toBe(false);
  });
});

/** Minimal state builder — only the fields the banner reads matter. */
function state(overrides: Partial<TaskDetailState>): TaskDetailState {
  return {
    loading: false,
    task: TASK_ABOVE,
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
    slotsOpen: 5,
    maxTaskSlots: 20,
    basePoints: 20,
    factionMultiplier: 1.0,
    modifiedPoints: 20,
    inProgressCount: 0,
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

describe("LevelJumpBanner — markup out", () => {
  it("renders the level-jump tag + note when levelJumpSignup is true", () => {
    const html = renderToStaticMarkup(
      <LevelJumpBanner state={state({ levelJumpSignup: true })} />,
    );
    const text = html.replace(/<[^>]*>/g, "");
    expect(text, "distinct level-jump tag").toContain("Level-jump");
    // Note quotes the required level so the CTA never reads identical to an
    // at-or-below-level signup.
    expect(text, "note quotes the required level").toContain("4");
  });

  it("renders nothing when levelJumpSignup is false (spent / out of reach reads as locked)", () => {
    const html = renderToStaticMarkup(
      <LevelJumpBanner state={state({ levelJumpSignup: false })} />,
    );
    expect(html).toBe("");
  });
});
