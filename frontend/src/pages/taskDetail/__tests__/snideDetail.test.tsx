/**
 * S.N.I.D.E. task detail — the ransom dossier (#1035).
 *
 * `archetypeSlots` already guards the content slots and `detailContract` guards
 * the comments gate and the roster's absence across every registered skin. This
 * file pins the three things that are specific to THIS dress and that a future
 * "faithful to the design" edit would quietly undo:
 *
 *  1. **The censor never eats content.** The vendored design blacks out two
 *     words of every brief paragraph with `background: ink, color: transparent`
 *     — over the task's real instructions. #1023 already ruled the word-level
 *     strike out of the task card; the brief must survive VERBATIM, redaction
 *     rules and all.
 *  2. **The cut-up headline stays one readable string.** The design lays the
 *     word-cuts out as a flex row spaced with `gap`; a flex container discards
 *     whitespace-only children, so the accessible name came out as
 *     "Namethethingeveryone…". Inline flow with real spaces is the fix, and a
 *     revert to flex is invisible on screen.
 *  3. **The retired case-file voice is gone** (ADR-0057). The 794-line archetype
 *     this replaced spoke `snide.*` — case file, accomplices, verdict. Those
 *     keys still exist in tasks.json (the namespace is shared with the faction
 *     pages; the sweep is #1039), so nothing but a test stops one drifting back.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so copy keys resolve to English text.
import "../../../i18n";
import SnideTaskDetail from "../archetypes/SnideTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut, TaskSignupOut } from "../../../api/tasks";

/** Deliberately multi-word: the headline cuts one word per <span>. */
const TITLE = "Name the thing everyone is pretending not to notice";
/** Long enough to prove no clamp, and worded so a strike would be obvious. */
const BRIEF =
  "Write it down, photograph the evidence, and post it before anyone can talk you out of it.";

const TASK: TaskOut = {
  id: 305,
  title: TITLE,
  description: BRIEF,
  point_value: 120,
  level_required: 3,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: "snide",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 9,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "snide",
  created_by_level: 4,
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

const SIGNUP: TaskSignupOut = {
  character_id: 88,
  display_name: "Ossuary Pete",
  avatar_url: "",
  faction_slug: "snide",
  level: 7,
  status: "in_progress",
  signed_up_at: "2026-01-03T00:00:00Z",
};

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    submissions: [],
    signups: [],
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: true,
    levelJumpSignup: false,
    slotsOpen: 4,
    maxTaskSlots: 13,
    basePoints: 120,
    factionMultiplier: 1.0,
    modifiedPoints: 120,
    inProgressCount: 9,
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

describe("SNIDE task detail — the ransom dossier", () => {
  it("prints the brief whole — the censor redacts ornament, never content", () => {
    const { html, text } = render(<SnideTaskDetail state={baseState()} />);
    expect(text).toContain(BRIEF);
    // The metaphor survives as a decorative rule, which redacts nothing real.
    expect(html).toContain("snd-censor");
    // A struck word would be a span painted in the ink with transparent type.
    expect(html).not.toContain("color:transparent");
  });

  it("keeps the cut-up headline one readable string", () => {
    const { html, text } = render(<SnideTaskDetail state={baseState()} />);
    // Cut word by word across four treatments — Anton plain, Anton on acid,
    // Archivo Black knocked out, Special Elite underscored in pink.
    expect(html).toContain("--faction-snide-font-impact");
    expect(html).toContain("--faction-snide-font-black");
    expect(html).toContain("--faction-snide-font-type");
    expect(html).toContain("--faction-snide-note-knockout-bg");
    // …and still contiguous once the wrapping tags come off.
    expect(text).toContain(TITLE);
  });

  it("speaks the shared neutral copy, not the retired case-file voice", () => {
    const { text } = render(<SnideTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // The faction line resolves from factions.json by slug (ADR-0057).
    expect(text).toContain("S.N.I.D.E.");
    for (const retired of ["Case file", "Accomplices", "Verdict", "Top marks"]) {
      expect(text.toLowerCase()).not.toContain(retired.toLowerCase());
    }
  });

  it("hides the multiplier at the identity factor and shows the raw one otherwise", () => {
    expect(render(<SnideTaskDetail state={baseState()} />).text).not.toContain("×");
    const { text } = render(
      <SnideTaskDetail
        state={baseState({ factionMultiplier: 1.5, modifiedPoints: 180 })}
      />,
    );
    expect(text).toContain("×1.50");
    // Base and total both stay legible; the badge replaces neither.
    expect(text).toContain("120");
    expect(text).toContain("180");
  });

  it("renders no in-progress roster — the header count is the whole story", () => {
    const { text } = render(
      <SnideTaskDetail state={baseState({ signups: [SIGNUP] })} />,
    );
    expect(text).not.toContain("Ossuary Pete");
    expect(text).toContain("In progress");
    expect(text).toContain("9");
  });

  it("bylines the author and links the character, not the account", () => {
    const { html, text } = render(<SnideTaskDetail state={baseState()} />);
    expect(text).toContain("Wren Abalone");
    expect(text).toContain("author · lvl 4");
    expect(html).toContain('href="/characters/31"');
  });
});
