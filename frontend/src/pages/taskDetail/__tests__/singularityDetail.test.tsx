/**
 * Singularity task detail (#1034): what the shared suites cannot see. The face
 * resolves via its token (a hardcoded family builds green and loses the look);
 * motion stays in index.css's classes under the reduced-motion guard (#911); the
 * design's voice is cut (ADR-0057); no roster; raw factor; no
 * `/praxis?task_id=N`. Static render, so desktop sizes only.
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
    expect(html).toContain('class="sg-scan"');
    expect(html).toContain('class="sg-pulse"');
    expect(html).toContain('class="sg-cursor"');
    // Inline `animation:` would bypass the reduced-motion guard (#911).
    expect(html).not.toContain("animation:");
  });

  it("carries no theme ternary — both halves of every glow are tokens", () => {
    const { html } = render(<SingularityTaskDetail state={baseState()} />);
    expect(html).toContain("var(--faction-singularity-term-halo-green)");
    expect(html).toContain("var(--faction-singularity-term-halo-blue)");
    // `-term-cta-glow` now lives on the filed-praxis button (#2642). Asserted
    // because it is `none` in light and a shadow in dark: ternary bait.
    const { html: filed } = render(
      <SingularityTaskDetail
        state={baseState({ mySubmission: aPraxisCard({ id: 91 }), canSignUp: false })}
      />,
    );
    expect(filed).toContain("var(--faction-singularity-term-cta-glow)");
  });

  // #1124 retired the task id; hex is the shape it would come back in.
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
    // ADR-0057: words the design invented.
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
    // The design's rounded square is a duplicate-key artifact; authors get circles.
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
