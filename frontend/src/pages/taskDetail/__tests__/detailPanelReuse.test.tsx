/**
 * The task-detail points-and-sign-up panel mounts the components that already
 * exist, rather than a ninth hand-built pair of them (#2554).
 *
 * ## The seams
 *
 * 1. **`TaskWorthStamp`** — the panel's worth cell is the faction's registered
 *    `scoreStamp` surface (ADR-0049), reached through the ONE `ScoreStamp`
 *    dispatcher. The assertion is structural containment rather than a hunt for
 *    per-faction marker strings: the archetype's markup must literally contain
 *    the markup `TaskWorthStamp` renders on its own. A reimplementation that
 *    merely *looks* the same cannot pass that, which is the whole point of the
 *    ruling.
 * 2. **`detailSignupCta`** — which control the one action slot draws, resolved
 *    through the cards' own `taskCardSignupCta` so the two surfaces cannot
 *    disagree. This is a pure function and is pinned as one.
 *
 * Harness: `renderToStaticMarkup`, no DOM — same as `signupCta.test.tsx`.
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

/** Every slug that owns a task-detail archetype, plus na's fall-through. */
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

/** The state a task of `slug` produces, with the faction's own archetype. */
function stateFor(slug: string, overrides: Partial<TaskDetailState> = {}) {
  const from = baseState(overrides);
  return {
    ...from,
    task: { ...from.task!, primary_faction_slug: slug },
  } as TaskDetailState;
}

/**
 * Markup with React's `useId` values flattened.
 *
 * The Everymen roundel mints an SVG `<defs>` id per mount (`wz-roundel-_R_3_`
 * vs `wz-roundel-_R_ra_`), so two renders of the same component differ in
 * exactly those bytes and nowhere else. Normalising them is what keeps the
 * containment assertion below about the COMPONENT rather than about React's
 * counter.
 *
 * The suffix is matched loosely because `useId`'s format is React's to change
 * and it did: React 18 minted `R3`, React 19 mints `_R_3_`. Anchoring on the
 * old `R` right after the dash silently stopped normalising anything under 19,
 * which failed this test on the ids rather than on the markup it is about.
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
    // Albescent overrides the whole readout through `worthSlot` and is the one
    // recorded exception (#2549/#2550 are re-cutting its ground).
    if (slug === "albescent") continue;

    it(`${slug}: the archetype's markup contains ScoreStamp's own output`, () => {
      const state = stateFor(slug);
      const stamp = markup(<TaskWorthStamp state={state} />);
      const Archetype = archetypes[slug as keyof typeof archetypes];
      const page = markup(<Archetype state={state} />);
      // `MemoryRouter` contributes nothing to the string, so the stamp's markup
      // is a literal substring of any page that mounts it.
      expect(page).toContain(stamp);
    });
  }

  it("albescent keeps its prism-ring override", () => {
    const state = stateFor("albescent");
    const page = markup(<AlbescentTaskDetail state={state} />);
    expect(page).toContain("alb-detail-ring");
  });

  it("draws a task's worth — #1444's zero-score guard must not blank it", () => {
    // The guard is on a praxis that banked nothing. A task always has a point
    // value, so the stamp has to survive the adapter.
    const out = markup(<TaskWorthStamp state={stateFor("na")} />);
    expect(out).not.toBe("");
    expect(out).toContain("30");
  });

  it("keeps the breakdown gate: no base row at a neutral multiplier", () => {
    // `showWorthBreakdown`'s policy (#1704), enforced by `scoreBreakdown`'s own
    // row selection off the RAW factor — never `modifiedPoints / basePoints`.
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
    // `canSignUp` is `signedIn && can_sign_up` (#1497); the anonymous read keeps
    // its own gate even though the server also withholds the flag.
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
    // The behavioural gap #2554 closes. On a card this reason is "the one
    // refusal that is a door" (#2359); the detail page used to draw nothing.
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
    // `already_active_member` is wider than "holds a draft" — it also covers a
    // submitted or pending praxis, with nothing left to edit.
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
    // The detail page's own in-progress block is the richer affordance — it
    // offers "drop" as well — so the slot is the FALLBACK, never a second link
    // to the same editor in the same panel.
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
