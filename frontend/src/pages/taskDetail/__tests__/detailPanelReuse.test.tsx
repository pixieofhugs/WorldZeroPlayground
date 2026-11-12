/**
 * The task-detail panel mounts existing components (#2554): `TaskWorthStamp`
 * (the faction's `scoreStamp`, ADR-0049), asserted by literal markup containment
 * so a lookalike cannot pass; and `detailSignupCta`, the cards' resolver.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import AlbescentTaskDetail from "../archetypes/AlbescentTaskDetail";
import { TaskWorthStamp, detailSignupCta } from "../archetypes/shared";
import type { TaskDetailState } from "../useTaskDetail";
import { aPraxisCard, aTask } from "../../../test/fixtures";

const DETAIL_SLUGS = [...Object.keys(surfaceMap("taskDetail")), "na"];

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: aTask({
      id: 91,
      title: "Repair the towpath bridge",
      description: "Two planks and a weekend.",
      point_value: 30,
      level_required: 1,
      created_by: 3,
      primary_faction_slug: "na",
      created_by_display_name: "",
    }),
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

function stateFor(slug: string, overrides: Partial<TaskDetailState> = {}) {
  const from = baseState(overrides);
  return {
    ...from,
    task: { ...from.task!, primary_faction_slug: slug },
  } as TaskDetailState;
}

/**
 * Markup with `useId` values flattened (the Everymen roundel mints one per
 * mount). Suffix matched loosely: React 19 changed the format.
 */
function markup(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>).replace(
    /wz-roundel-[\w:-]+/g,
    "wz-roundel-ID",
  );
}

const archetypes = { ...surfaceMap("taskDetail"), na: DefaultTaskDetail };

describe("half 1 — the worth cell is the faction's own score stamp", () => {
  for (const slug of DETAIL_SLUGS) {
    // Albescent overrides via `worthSlot`: the recorded exception.
    if (slug === "albescent") continue;

    it(`${slug}: the archetype's markup contains ScoreStamp's own output`, () => {
      const state = stateFor(slug);
      const stamp = markup(<TaskWorthStamp state={state} />);
      const Archetype = archetypes[slug as keyof typeof archetypes];
      const page = markup(<Archetype state={state} />);
      expect(page).toContain(stamp);
    });
  }

  it("albescent keeps its prism-ring override", () => {
    const state = stateFor("albescent");
    const page = markup(<AlbescentTaskDetail state={state} />);
    expect(page).toContain("alb-detail-ring");
  });

  it("draws a task's worth — #1444's zero-score guard must not blank it", () => {
    // The guard targets a praxis that banked nothing; a task always has points.
    const out = markup(<TaskWorthStamp state={stateFor("na")} />);
    expect(out).not.toBe("");
    expect(out).toContain("30");
  });

  it("keeps the breakdown gate: no base row at a neutral multiplier", () => {
    // #1704, off the raw factor.
    const neutral = markup(<TaskWorthStamp state={stateFor("na")} />);
    expect(neutral).not.toContain("×1.00");

    const boosted = markup(
      <TaskWorthStamp
        state={stateFor("na", {
          factionMultiplier: 1.25,
          modifiedPoints: 37.5,
        })}
      />,
    );
    expect(boosted).toContain("×1.25");
  });
});

describe("half 2 — detailSignupCta, the one action slot", () => {
  it("offers the sign-up when the server allows it", () => {
    const cta = detailSignupCta(baseState());
    expect(cta?.label).toBe("Sign up");
    expect(cta?.onPress).toBeTypeOf("function");
    expect(cta?.href).toBeUndefined();
  });

  it("draws nothing for a viewer the page has no signed-in gate for", () => {
    // `canSignUp` is `signedIn && can_sign_up` (#1497).
    expect(detailSignupCta(baseState({ canSignUp: false }))).toBeNull();
  });

  it("hides a refusal rather than drawing it disabled", () => {
    const state = baseState({ canSignUp: false });
    state.task = {
      ...state.task!,
      can_sign_up: false,
      signup_reason: "below_level",
    };
    expect(detailSignupCta(state)).toBeNull();
  });

  it("THE DOOR: already_active_member with a draft links to its editor", () => {
    // #2554: on a card this refusal is a door (#2359).
    const state = baseState({ canSignUp: false });
    state.task = {
      ...state.task!,
      can_sign_up: false,
      signup_reason: "already_active_member",
      in_progress_praxis_id: 501,
    };
    const cta = detailSignupCta(state);
    expect(cta?.href).toBe("/praxis/501/edit");
    expect(cta?.onPress).toBeUndefined();
    expect(cta?.denied).toBe(false);
  });

  it("keeps the conjunction: the reason alone is not a door", () => {
    // The reason also covers a submitted/pending praxis with nothing to edit.
    const state = baseState({ canSignUp: false });
    state.task = {
      ...state.task!,
      can_sign_up: false,
      signup_reason: "already_active_member",
      in_progress_praxis_id: null,
    };
    expect(detailSignupCta(state)).toBeNull();
  });

  it("stands the door down where the page already draws the draft", () => {
    // The page's own in-progress block (with drop) wins; no second link.
    const state = baseState({
      canSignUp: false,
      isInProgress: true,
      inProgressPraxisId: 501,
    });
    state.task = {
      ...state.task!,
      can_sign_up: false,
      signup_reason: "already_active_member",
      in_progress_praxis_id: 501,
    };
    expect(detailSignupCta(state)).toBeNull();

    const submitted = baseState({
      canSignUp: false,
      mySubmission: aPraxisCard({ id: 77, task_id: 91 }),
    });
    submitted.task = { ...submitted.task!, ...state.task };
    expect(detailSignupCta(submitted)).toBeNull();
  });
});

describe("half 2 — every archetype renders the shared control", () => {
  for (const slug of DETAIL_SLUGS) {
    it(`${slug}: the door reaches the sign-up slot`, () => {
      const state = stateFor(slug, { canSignUp: false });
      state.task = {
        ...state.task!,
        can_sign_up: false,
        signup_reason: "already_active_member",
        in_progress_praxis_id: 501,
      };
      const Archetype = archetypes[slug as keyof typeof archetypes];
      const page = markup(<Archetype state={state} />);
      expect(page).toContain('href="/praxis/501/edit"');
      expect(page).toContain("Work on this?");
    });

    it(`${slug}: the sign-up keeps its e2e handle`, () => {
      const Archetype = archetypes[slug as keyof typeof archetypes];
      const page = markup(<Archetype state={stateFor(slug)} />);
      expect(page).toContain('data-testid="task-signup-cta"');
    });
  }
});
