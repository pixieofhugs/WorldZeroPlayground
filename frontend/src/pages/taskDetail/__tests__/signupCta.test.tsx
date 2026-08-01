/**
 * "Begin again" — the sign-up CTA reads the server's reason (#1497).
 *
 * #1359 stopped the browse SQL hiding a task an Everymen character may claim a
 * second time (`can_hold_multiple_memberships`, "Double Dipper"), but the detail
 * page still ANDed its own "am I already on this" check into `canSignUp` — the
 * client-side mirror of a server rule that #1385 deleted elsewhere. The mirror
 * did not match: for a perk holder the server says yes and the mirror said no,
 * so the CTA vanished for exactly the player the perk exists for.
 *
 * **Both halves are asserted, or this suite cannot tell "fixed the CTA" from
 * "removed the gate":**
 *  1. Server allows + reason `multi_membership`  -> CTA renders, reads "Begin again"
 *  2. Server refuses (`already_active_member`)   -> no CTA at all, either label
 *
 * The render half walks the real `surfaceMap('taskDetail')` registry rather than
 * one skin: the archetype dispatches on the TASK's faction, so an Everymen viewer
 * meets whichever skin the task wears, and all of them must say it.
 *
 * Harness: `renderToStaticMarkup`, no DOM, no effects — so the hook itself is not
 * mountable and its gate is pinned through the pure `canSignUpForTask`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n"; // real catalogs — a missing key throws rather than passing
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import {
  SIGNUP_REASON_MULTI_MEMBERSHIP,
  canSignUpForTask,
  signupCtaKey,
} from "../signupCta";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";
import type { PraxisCardOut } from "../../../api/praxis";

const TASK: TaskOut = {
  id: 91,
  title: "Repair the towpath bridge",
  description: "Two planks and a weekend.",
  point_value: 30,
  level_required: 1,
  status: "active",
  task_type: "standard",
  created_by: 3,
  primary_faction_slug: "everymen",
  metatask_faction_slug: null,
  created_at: "2026-01-01T00:00:00Z",
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

/** A praxis the viewer already filed on this very task — the state the mirror keyed on. */
const MY_PRAXIS: PraxisCardOut = {
  id: 501,
  task_id: TASK.id,
  task_title: TASK.title,
  task_point_value: 30,
  task_level_required: 1,
  type: "solo",
  status: "submitted",
  title: "First go",
  moderation_status: "visible",
  created_by_id: 3,
  created_by_display_name: "Wren",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  submitted_at: "2026-01-02T00:00:00Z",
  member_count: 1,
  score: 4,
  voter_count: 1,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 4,
  is_top_for_task: false,
  task_faction_slug: "everymen",
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
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 30,
    factionMultiplier: 1.0,
    modifiedPoints: 30,
    inProgressCount: 4,
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

function textOf(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>).replace(
    /<[^>]*>/g,
    "",
  );
}

const archetypes = {
  ...surfaceMap("taskDetail"),
  __default__: DefaultTaskDetail,
};

describe("signupCtaKey — the label follows the server's reason", () => {
  it("maps the multi-membership reason to the 'again' copy", () => {
    expect(signupCtaKey(SIGNUP_REASON_MULTI_MEMBERSHIP)).toBe(
      "detail.signup.ctaAgain",
    );
  });

  it("falls back to the plain CTA for no reason, or one it has never heard of", () => {
    expect(signupCtaKey(null)).toBe("detail.signup.cta");
    expect(signupCtaKey(undefined)).toBe("detail.signup.cta");
    // A future backend reason must not blank the button.
    expect(signupCtaKey("some_reason_from_a_later_era")).toBe(
      "detail.signup.cta",
    );
  });
});

describe("canSignUpForTask — the deleted client-side mirror", () => {
  it("says yes on the server's word alone", () => {
    expect(canSignUpForTask({ signedIn: true, canSubmitPraxis: true })).toBe(
      true,
    );
  });

  it("says no when the server refuses, and when nobody is signed in", () => {
    expect(canSignUpForTask({ signedIn: true, canSubmitPraxis: false })).toBe(
      false,
    );
    expect(canSignUpForTask({ signedIn: false, canSubmitPraxis: true })).toBe(
      false,
    );
  });

  it("treats an absent flag as a refusal", () => {
    // Anonymous and pre-#1497 reads carry no flag; absent must not read as yes.
    expect(
      canSignUpForTask({ signedIn: true, canSubmitPraxis: undefined }),
    ).toBe(false);
  });
});

describe("every task-detail skin renders both halves", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug}: the perk holder gets "Begin again", not "Sign up"`, () => {
      // The state a Double Dipper viewer now produces: already on the task —
      // draft AND filed praxis, the two terms the old mirror gated on — while
      // the server still says yes and explains why.
      const text = textOf(
        <Archetype
          state={baseState({
            task: {
              ...TASK,
              can_submit_praxis: true,
              signup_reason: SIGNUP_REASON_MULTI_MEMBERSHIP,
            },
            canSignUp: true,
            isInProgress: true,
            inProgressPraxisId: MY_PRAXIS.id,
            mySubmission: MY_PRAXIS,
            submissions: [MY_PRAXIS],
          })}
        />,
      );
      expect(text).toContain("Begin again");
      expect(text).not.toContain("Sign up");
    });

    it(`${slug}: without the perk the gate still shuts`, () => {
      // Same membership, no ability: the server refuses and names the gate, so
      // no call to action renders under either label.
      const text = textOf(
        <Archetype
          state={baseState({
            task: {
              ...TASK,
              can_submit_praxis: false,
              signup_reason: "already_active_member",
            },
            canSignUp: false,
            isInProgress: true,
            inProgressPraxisId: MY_PRAXIS.id,
            mySubmission: MY_PRAXIS,
            submissions: [MY_PRAXIS],
          })}
        />,
      );
      expect(text).not.toContain("Begin again");
      expect(text).not.toContain("Sign up");
    });

    it(`${slug}: a first claim still reads "Sign up"`, () => {
      const text = textOf(<Archetype state={baseState()} />);
      expect(text).toContain("Sign up");
      expect(text).not.toContain("Begin again");
    });
  }
});
