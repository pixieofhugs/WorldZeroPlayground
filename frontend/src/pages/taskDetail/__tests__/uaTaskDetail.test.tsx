/**
 * UA task detail — the rebuilt v2 skin (#1036).
 *
 * The shared slots are already guarded (`archetypeSlots`, `detailContract`), so
 * this file only pins what is UA's and what a green build would otherwise hide.
 * Every assertion below exists because the same thing has actually gone wrong on
 * this exact faction before:
 *
 *  - **The mark renders.** #821 shipped a UA praxis card with NO ensō at all and
 *    nobody noticed, because `tsc` has no opinion about ornament. The mask URL
 *    is the only static-render evidence the circle is on the page.
 *  - **Both faces resolve.** UA spent months silently rendering in IM Fell
 *    English (#839) — a named-but-unloaded family falls back to a generic serif
 *    and no check we run can see it. Asserting on the two font TOKENS at least
 *    pins that the surface asks for UA's faces rather than inheriting.
 *  - **The design's invented faction label never landed.** `ua-task-detail.jsx`
 *    captions the faction line 'Unbroken Ascension', which is not this faction's
 *    name; #1036 guessed a different wrong name ('Universal Assembly'). ADR-0050
 *    is the precedent — a stale design label inverted two factions across a whole
 *    wave. The line resolves from the catalog by slug instead.
 *  - **No faction voice.** ADR-0057. The `tasks:ua.*` keys the old 681-line
 *    archetype spoke outlived #1039's sweep only because the dormant mobile twin
 *    still read them; #1068 deleted that twin and the whole namespace with it.
 *    The voice can no longer come back by accident — but the assertion stays,
 *    because re-adding a key is one line and this is what would catch it.
 *  - **No gold.** #853 deleted the legacy gilt-salon family and UA's gold went to
 *    WOW; the design's `gilt:#A98246` rule-stop has deliberately no token.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so copy keys resolve to English text.
import "../../../i18n";
import UaTaskDetail from "../archetypes/UaTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut } from "../../../api/tasks";

const TASK: TaskOut = {
  id: 207,
  title: "Render the old library facade in charcoal",
  description: "One vantage, one sitting. Smudges are testimony.",
  point_value: 24,
  level_required: 4,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: "ua",
  metatask_faction_slug: null,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 17,
  created_by_display_name: "Ines Aurel",
  created_by_faction_slug: "ua",
  created_by_level: 5,
  can_sign_up: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
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
    basePoints: 24,
    factionMultiplier: 1.0,
    modifiedPoints: 24,
    inProgressCount: 17,
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

describe("UA task detail — the marks and the faces", () => {
  it("draws the ensō, twice and only twice: the faction line and the total", () => {
    const { html, text } = render(<UaTaskDetail state={baseState()} />);
    // The one ensō (#908): the vendored brush drawing, painted through a mask.
    // `Enso` emits the prefixed declaration too, so count only the -webkit- one
    // — two of those is two marks, not four.
    expect(html.match(/-webkit-mask-image:url\(\/factionMarks\/enso\.webp\)/g)).toHaveLength(2);
    // The mark is reserved for the SCORE and the FACTION MARK — never a button
    // seal, never a "best judged" badge, however the design draws it.
    expect(text).toContain("24");
    // The design's `enso-detailed.svg` was deliberately not vendored; a second
    // ensō asset is exactly the drift the manifest exists to prevent.
    expect(html).not.toContain("enso-detailed");
  });

  it("floats the lotus as a token-tinted ground wash, not an <img>", () => {
    const { html } = render(<UaTaskDetail state={baseState()} />);
    expect(html).toContain("var(--faction-ua-card-lotus)");
    expect(html).toContain("var(--faction-ua-card-lotus-opacity)");
    // An external SVG cannot read a custom property, so it could not dim.
    expect(html).not.toContain('src="lotus.svg"');
  });

  it("asks for UA's two faces by token, not a generic serif (#839)", () => {
    const { html } = render(<UaTaskDetail state={baseState()} />);
    expect(html).toContain("var(--faction-ua-card-font)"); // Cormorant Garamond
    expect(html).toContain("var(--faction-ua-body-font)"); // EB Garamond
  });

  it("paints only with live --faction-ua-* tokens — no legacy palette, no gilt", () => {
    const { html } = render(<UaTaskDetail state={baseState()} />);
    // #853 deleted the legacy gilt-salon family outright.
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/);
    // The design's `gilt:#A98246` rule-stop has no token, deliberately.
    expect(html).not.toContain("--faction-ua-gilt");
    // No hex reaches the markup: every colour is a var() or a color-mix of one.
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});

describe("UA task detail — the shared contract in UA's dress", () => {
  it("speaks the shared neutral copy and none of the retired UA voice", () => {
    const { text } = render(<UaTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    // ADR-0057: the `tasks:ua.*` voice keys the old archetype spoke were
    // deleted by #1068's sweep, so this copy has no catalog to come back from —
    // it would have to be retyped, and this is what would notice.
    for (const retired of [
      "Sealed work",
      "The finest hand",
      "Anno",
      "Honoraria",
      "On view",
      "Matriculated",
    ]) {
      expect(text).not.toContain(retired);
    }
    // Nor the design's own words, which ADR-0057 cuts just as hard.
    for (const drawn of [
      "The Call",
      "finished works",
      "Best judged",
      "Said aloud",
      "In hand",
      "Continue the work",
    ]) {
      expect(text).not.toContain(drawn);
    }
  });

  it("names the faction from the catalog, never the design's invention", () => {
    const { text } = render(<UaTaskDetail state={baseState()} />);
    // ADR-0050: the vendored design captions this line 'Unbroken Ascension',
    // and #1036 anticipated a different wrong label. Neither is a faction.
    expect(text).not.toContain("Unbroken Ascension");
    expect(text).not.toContain("Universal Assembly");
    expect(text).toContain("UA");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<UaTaskDetail state={baseState()} />);
    expect(text).toContain("In progress");
    expect(text).toContain("17");
  });

  it("hides the ×mult badge at the identity factor and shows the raw one otherwise", () => {
    expect(render(<UaTaskDetail state={baseState()} />).text).not.toContain("×");
    const { text } = render(
      <UaTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 30 })}
      />,
    );
    expect(text).toContain("×1.25");
    // Base and total stay separately legible; the badge substitutes for neither,
    // and neither is reconstructed from the other (ADR-0053 / ADR-0055).
    expect(text).toContain("24");
    expect(text).toContain("30");
  });

  it("draws the author byline and the brief in full, unclamped", () => {
    const long = "x".repeat(2000);
    const { html, text } = render(
      <UaTaskDetail state={baseState({ task: { ...TASK, description: long } })} />,
    );
    expect(text).toContain("Ines Aurel");
    expect(text).toContain("author · lvl 5");
    expect(html).toContain('href="/characters/31"');
    expect(text).toContain(long);
  });

  it("expands the gallery in place instead of linking out to the feed", () => {
    const { html } = render(<UaTaskDetail state={baseState()} />);
    // The reader stays on the task, even now that the URL filters (#1050).
    expect(html).not.toContain("task_id=");
  });
});
