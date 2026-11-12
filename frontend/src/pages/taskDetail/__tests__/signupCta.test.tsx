/**
 * The sign-up CTA reads the server's reason (#1497). A client-side "already on
 * this" mirror hid the CTA from multi-membership perk holders. Both halves are
 * asserted so "fixed the CTA" is distinguishable from "removed the gate", across
 * every skin (the archetype follows the task's faction).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n"; // real catalogs: a missing key throws
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import {
  SIGNUP_IN_PROGRESS_KEY,
  SIGNUP_REASON_MULTI_MEMBERSHIP,
  SIGNUP_SUBMITTED_KEY,
  canSignUpForTask,
  signupCtaKey,
} from "../signupCta";
import i18n from "../../../i18n";
import type { TaskDetailState } from "../useTaskDetail";
import { aPraxisCard, aTask } from '../../../test/fixtures'

const TASK = aTask({
  id: 91,
  title: "Repair the towpath bridge",
  description: "Two planks and a weekend.",
  point_value: 30,
  level_required: 1,
  created_by: 3,
  primary_faction_slug: "everymen",
  created_by_display_name: "",
});

/** The viewer's filed praxis on this task: what the old mirror keyed on. */
const MY_PRAXIS = aPraxisCard({
  id: 501,
  task_id: TASK.id,
  task_title: TASK.title,
  task_point_value: 30,
  task_level_required: 1,
  title: "First go",
  created_by_id: 3,
  created_by_display_name: "Wren",
  score: 4,
  voter_count: 1,
  task_faction_slug: "everymen",
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
    dropConfirm: null,
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
    // An unknown future reason must not blank the button.
    expect(signupCtaKey("some_reason_from_a_later_era")).toBe(
      "detail.signup.cta",
    );
  });
});

describe("the two doors out of one denial (#2359, #2643)", () => {
  it("keys both onto copy this build actually has", () => {
    // A missing key resolves to itself.
    expect(i18n.t(`tasks:${SIGNUP_IN_PROGRESS_KEY}`)).not.toBe(
      SIGNUP_IN_PROGRESS_KEY,
    );
    expect(i18n.t(`tasks:${SIGNUP_SUBMITTED_KEY}`)).toBe("Read your praxis");
  });

  it("borrows the task detail's OWN submitted copy rather than a synonym", () => {
    // Owner ruling 2026-08-24: one key so a copy edit lands on both surfaces.
    expect(SIGNUP_SUBMITTED_KEY).toBe("detail.submitted.view");
  });

  it("stays out of signupCtaKey — the wire's reason cannot tell them apart", () => {
    // The server sends one reason for draft and filed alike; the door is chosen
    // by praxis id in `taskCard/signupAffordance.ts`.
    expect(signupCtaKey("already_active_member")).toBe(
      "detail.signup.denied.alreadyActiveMember",
    );
  });
});

describe("canSignUpForTask — the deleted client-side mirror", () => {
  it("says yes on the server's word alone", () => {
    expect(canSignUpForTask({ signedIn: true, canSignUp: true })).toBe(
      true,
    );
  });

  it("says no when the server refuses, and when nobody is signed in", () => {
    expect(canSignUpForTask({ signedIn: true, canSignUp: false })).toBe(
      false,
    );
    expect(canSignUpForTask({ signedIn: false, canSignUp: true })).toBe(
      false,
    );
  });

  it("treats an absent flag as a refusal", () => {
    // Anonymous reads carry no flag.
    expect(
      canSignUpForTask({ signedIn: true, canSignUp: undefined }),
    ).toBe(false);
  });
});

describe("every task-detail skin renders both halves", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug}: the perk holder gets "Begin again", not "Sign up"`, () => {
      // Already on the task (draft and filed) while the server says yes.
      const text = textOf(
        <Archetype
          state={baseState({
            task: {
              ...TASK,
              can_sign_up: true,
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
      const text = textOf(
        <Archetype
          state={baseState({
            task: {
              ...TASK,
              can_sign_up: false,
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
