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

/** A praxis the viewer already filed on this very task — the state the mirror keyed on. */
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
    // A future backend reason must not blank the button.
    expect(signupCtaKey("some_reason_from_a_later_era")).toBe(
      "detail.signup.cta",
    );
  });
});

describe("the two doors out of one denial (#2359, #2643)", () => {
  it("keys both onto copy this build actually has", () => {
    // The real catalogs are loaded above, so a key that is not in them resolves
    // to itself — which is what this catches.
    expect(i18n.t(`tasks:${SIGNUP_IN_PROGRESS_KEY}`)).not.toBe(
      SIGNUP_IN_PROGRESS_KEY,
    );
    expect(i18n.t(`tasks:${SIGNUP_SUBMITTED_KEY}`)).toBe("Read your praxis");
  });

  it("borrows the task detail's OWN submitted copy rather than a synonym", () => {
    // The owner ruling (2026-08-24) is that "Read your praxis" is right for both
    // surfaces. Pointing the card at `detail.submitted.view` — the key the
    // detail's own submitted block renders — is what makes a future copy edit
    // land on both at once instead of drifting them apart.
    expect(SIGNUP_SUBMITTED_KEY).toBe("detail.submitted.view");
  });

  it("stays out of signupCtaKey — the wire's reason cannot tell them apart", () => {
    // Neither key is reachable from a `signup_reason`: the server sends
    // `already_active_member` for a draft and a filed praxis alike. Which door
    // opens is decided by which praxis id the row carries, in
    // `components/taskCard/signupAffordance.ts`. If this ever starts returning
    // one of them, the reason has grown a sixth value and this table needs a
    // real row rather than a constant.
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
    // Anonymous and pre-#1497 reads carry no flag; absent must not read as yes.
    expect(
      canSignUpForTask({ signedIn: true, canSignUp: undefined }),
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
      // Same membership, no ability: the server refuses and names the gate, so
      // no call to action renders under either label.
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
