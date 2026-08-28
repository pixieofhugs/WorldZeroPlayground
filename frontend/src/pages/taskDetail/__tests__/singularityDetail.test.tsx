/**
 * Singularity task detail (C4, #1034) — the render check.
 *
 * `archetypeSlots.test.tsx` already walks every registered archetype for the
 * content slots and `detailContract.test.tsx` for the comments gate, so this
 * file only guards what is specific to this skin and easy to lose:
 *
 *  1. **The dress renders and the FACE resolves.** Share Tech Mono reaches the
 *     page through `--faction-singularity-card-font`; a skin that hardcodes the
 *     family string, or reaches for a token that does not exist, silently falls
 *     back to a generic monospace and the terminal look is simply gone with a
 *     green build. Same for the three motion classes: they are index.css's, and
 *     index.css is where the `prefers-reduced-motion` guard lives — a component
 *     that writes `animation:` inline would bypass it (#911).
 *  2. **The voice is gone.** ADR-0057: no faction voice on task detail. This is
 *     the most heavily voiced design in the set after Albescent, and every one
 *     of its words is cut in favour of the shared `detail.*` keys.
 *  3. **No in-progress roster** (owner ruling 2026-07-28, reversing epic #1028
 *     decision 3) — the header count is the only place that number appears.
 *  4. **The `×mult` badge is off the raw factor**, not a reconstructed
 *     `modifiedPoints / basePoints` ratio (ADR-0053's trap, ADR-0055's rule).
 *  5. **No `/praxis?task_id=N`.** The gallery expands in place; the link was
 *     dead on every archetype before #1050 and is not wanted now either.
 *
 * `renderToStaticMarkup` only: no DOM, no effects, so `useFormFactor()` reports
 * its SSR default of "desktop" and this exercises the desktop size set.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import SingularityTaskDetail from "../archetypes/SingularityTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aPraxisCard, aTask } from '../../../test/fixtures'

const TASK = aTask({
  id: 208,
  title: "Log one week of your resting heart rate",
  description: "One reading each morning before you rise.",
  point_value: 24,
  level_required: 3,
  created_by: 31,
  primary_faction_slug: "singularity",
  in_progress_count: 17,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "singularity",
  created_by_level: 4,
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
    dropConfirm: null,
    ...overrides,
  };
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

describe("Singularity task detail — the terminal dress", () => {
  it("sets its type through the faction's own font token", () => {
    const { html } = render(<SingularityTaskDetail state={baseState()} />);
    // Share Tech Mono, reached by token. A hardcoded family string or a
    // misspelled token both build green and both lose the face.
    expect(html).toContain("var(--faction-singularity-card-font)");
    expect(html).not.toContain("Share Tech Mono");
  });

  it("draws the chassis, the raster and the sweep from the term-* family", () => {
    const { html } = render(<SingularityTaskDetail state={baseState()} />);
    expect(html).toContain("var(--faction-singularity-term-bg)");
    expect(html).toContain("var(--faction-singularity-term-chrome)");
    expect(html).toContain("var(--faction-singularity-term-panel)");
    expect(html).toContain("var(--faction-singularity-term-scan)");
    expect(html).toContain("var(--faction-singularity-term-sweep)");
  });

  it("leaves every motion to index.css, never an inline animation", () => {
    const { html } = render(<SingularityTaskDetail state={baseState()} />);
    // The sweep, the process light and the prompt cursor.
    expect(html).toContain('class="sg-scan"');
    expect(html).toContain('class="sg-pulse"');
    expect(html).toContain('class="sg-cursor"');
    // index.css owns the `prefers-reduced-motion` guard; an inline `animation:`
    // would render under it (#911).
    expect(html).not.toContain("animation:");
  });

  it("carries no theme ternary — both halves of every glow are tokens", () => {
    const { html } = render(<SingularityTaskDetail state={baseState()} />);
    expect(html).toContain("var(--faction-singularity-term-halo-green)");
    expect(html).toContain("var(--faction-singularity-term-halo-blue)");
    // `-term-cta-glow` moved with its control (#2642). The SIGN-UP now wears
    // the task card's paint, which is this same lit key without the bloom, so
    // the glow is drawn on the state that still spends `primaryButton` — the
    // way back to a filed praxis. (Not the DRAFT's "continue", which stills the
    // shadow to `none` on purpose.) It is asserted rather than dropped because
    // the token is `none` in light and a real shadow in dark: exactly the kind
    // of value a ternary would come back as.
    const { html: filed } = render(
      <SingularityTaskDetail
        state={baseState({ mySubmission: aPraxisCard({ id: 91 }), canSignUp: false })}
      />,
    );
    expect(filed).toContain("var(--faction-singularity-term-cta-glow)");
  });

  // The window bar used to slug the task's id in hex (`0x0D0` for 208) as a
  // process id. #1124 retired the task id from this page, and a base-16 id is
  // still the id, so the slug went with the `Task №{id}` crumb beside it. The
  // assertion inverts rather than disappears: hex is exactly the shape this
  // number would come back in.
  it("slugs no process id — the task id is gone from the window bar, hex included", () => {
    const { text } = render(<SingularityTaskDetail state={baseState()} />);
    expect(text).not.toContain("0x");
    expect(text).not.toContain("№");
  });
});

describe("Singularity task detail — the shared anatomy", () => {
  it("speaks the shared neutral copy, not the design's terminal voice", () => {
    const { text } = render(<SingularityTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
    expect(text).toContain("Singularity");
    // ADR-0057 — every one of these is a word the design invented.
    for (const voiced of [
      "the_observation",
      "sealed logs",
      "thread",
      "JOIN ARRAY",
      "highest signal",
      "nodes synced",
      "node slots",
      "PROTOCOL",
      "ARRAY",
    ]) {
      expect(text, `retired voice: ${voiced}`).not.toContain(voiced);
    }
  });

  it("renders the author byline with a ROUND avatar", () => {
    const { html, text } = render(<SingularityTaskDetail state={baseState()} />);
    expect(text).toContain("Wren Abalone");
    expect(text).toContain("author · lvl 4");
    expect(html).toContain('href="/characters/31"');
    // The design sets `borderRadius` twice on this element and the rounded
    // square wins; that duplicate key is a copy-paste artifact shared with
    // snide-task-detail.jsx. Every other design gives the author a circle.
    expect(html).toContain("border-radius:50%");
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<SingularityTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
    expect(text).toContain("17");
  });

  it("hides the multiplier badge at the identity factor", () => {
    const { text } = render(<SingularityTaskDetail state={baseState()} />);
    expect(text).not.toContain("×");
  });

  it("shows the raw multiplier badge once an era ships a real factor", () => {
    const { text } = render(
      <SingularityTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 30 })}
      />,
    );
    expect(text).toContain("×1.25");
    // Base and total are both legible; the badge substitutes for neither.
    expect(text).toContain("24");
    expect(text).toContain("30");
  });

  it("draws the brief in full — no clamp, no truncation", () => {
    const long = "x".repeat(2000);
    const { text } = render(
      <SingularityTaskDetail
        state={baseState({ task: { ...TASK, description: long } })}
      />,
    );
    expect(text).toContain(long);
  });

  it("never links out to the /praxis?task_id feed filter", () => {
    const { html } = render(<SingularityTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });
});
