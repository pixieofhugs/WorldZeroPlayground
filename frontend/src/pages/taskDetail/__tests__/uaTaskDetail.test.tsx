/**
 * UA task detail (#1036): what a green build hides, each a past regression. The
 * ensō renders (#821 shipped without it); both faces are requested by token
 * (#839); the faction line comes from the catalog, not the design's invented
 * label (ADR-0050); no faction voice (ADR-0057); no gold (#853).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import UaTaskDetail from "../archetypes/UaTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aTask } from '../../../test/fixtures'
import { factionName } from "../../../utils/factions";

const TASK = aTask({
  id: 207,
  title: "Render the old library facade in charcoal",
  description: "One vantage, one sitting. Smudges are testimony.",
  point_value: 24,
  level_required: 4,
  created_by: 31,
  primary_faction_slug: "ua",
  in_progress_count: 17,
  created_by_display_name: "Ines Aurel",
  created_by_faction_slug: "ua",
  created_by_level: 5,
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

describe("UA task detail — the marks and the faces", () => {
  it("draws the ensō, twice and only twice: the faction line and the total", () => {
    const { html, text } = render(<UaTaskDetail state={baseState()} />);
    // #908: count only the -webkit- mask declaration (one per mark).
    expect(html.match(/-webkit-mask-image:url\(\/factionMarks\/enso\.webp\)/g)).toHaveLength(2);
    // Reserved for the score and the faction mark only.
    expect(text).toContain("24");
    // Deliberately not vendored: one ensō asset.
    expect(html).not.toContain("enso-detailed");
  });

  it("floats the lotus as a token-tinted ground wash, not an <img>", () => {
    const { html } = render(<UaTaskDetail state={baseState()} />);
    expect(html).toContain("var(--faction-ua-card-lotus)");
    expect(html).toContain("var(--faction-ua-card-lotus-opacity)");
    // An external SVG cannot read a custom property.
    expect(html).not.toContain('src="lotus.svg"');
  });

  it("asks for UA's two faces by token, not a generic serif (#839)", () => {
    const { html } = render(<UaTaskDetail state={baseState()} />);
    expect(html).toContain("var(--faction-ua-card-font)"); // Cormorant Garamond
    expect(html).toContain("var(--faction-ua-body-font)"); // EB Garamond
  });

  it("paints only with live --faction-ua-* tokens — no legacy palette, no gilt", () => {
    const { html } = render(<UaTaskDetail state={baseState()} />);
    // #853.
    expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/);
    // The design's `gilt:#A98246` rule-stop has no token, deliberately.
    expect(html).not.toContain("--faction-ua-gilt");
    expect(html).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});

describe("UA task detail — the shared contract in UA's dress", () => {
  it("speaks the shared neutral copy", () => {
    const { text } = render(<UaTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    expect(text).toContain("Sign up");
  });

  it("names the faction from the catalog, never the design's invention", () => {
    const { text } = render(<UaTaskDetail state={baseState()} />);
    expect(text).not.toContain("Unbroken Ascension");
    expect(text).not.toContain("Universal Assembly");
    // Read from the catalog (ADR-0038); the name changed in #2332.
    expect(text).toContain(factionName("ua"));
  });

  it("renders the in-progress population as a header count", () => {
    const { text } = render(<UaTaskDetail state={baseState()} />);
    expect(text).toContain("people working on this");
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
    expect(html).not.toContain("task_id=");
  });
});
