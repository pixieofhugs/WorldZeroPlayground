/**
 * Task-detail content-slot invariant (ADR-0002): every registered archetype may
 * arrange the slots but not drop one. Static markup; submissions stay empty so
 * <PraxisCard> never mounts, and the gallery is anchored on its heading (the
 * sort toggle is conditional since #1704).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { surfaceMap } from "../../../factions";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aPraxisCard, aTask } from '../../../test/fixtures'
import i18n from "../../../i18n";

/** The opening tag directly enclosing the first `text`, to assert its dress. */
function enclosingTag(html: string, text: string): string {
  const at = html.indexOf(`>${text}<`);
  expect(at, `"${text}" is not rendered as an element's whole content`).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), at + 1);
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  // Tag-stripped: some skins split the title across spans.
  return { html, text: html.replace(/<[^>]*>/g, "") };
}

const TASK = aTask({
  title: "Reforestation",
  description: "Mangrove",
  point_value: 30,
  level_required: 3,
  created_by: 3,
  primary_faction_slug: "snide",
  created_by_display_name: "",
});

const MY_PRAXIS = aPraxisCard({
  task_title: "Reforestation",
  task_point_value: 30,
  task_level_required: 3,
  created_by_id: 3,
  created_by_display_name: "Ada",
  score: 4.2,
  points_from_votes: 0,
  task_faction_slug: "snide",
});

function baseState(overrides: Partial<TaskDetailState>): TaskDetailState {
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
    canSignUp: false,
    levelJumpSignup: false,
    slotsOpen: 13,
    maxTaskSlots: 17,
    basePoints: 4242,
    factionMultiplier: 1.0,
    modifiedPoints: 4242,
    inProgressCount: 0,
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

const archetypes = { ...surfaceMap('taskDetail'), __default__: DefaultTaskDetail };

describe("task-detail content-slot invariant", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} renders title, description, breadcrumb + praxis gallery`, () => {
      const { html, text } = render(
        <Archetype state={baseState({ canSignUp: true })} />,
      );
      expect(text, "title slot").toContain("Reforestation");
      expect(text, "description slot").toContain("Mangrove");
      expect(html, "all-tasks breadcrumb slot").toContain('href="/tasks"');
      expect(text, "praxis-gallery slot").toContain("completed praxis");
    });

    // Since #2554 skins draw their own ScoreStamp; only Albescent may print the
    // page's key. There, #2598 still holds: sentence-case catalog, CSS shout.
    it(`${slug} draws no second worth readout of its own`, () => {
      const { html } = render(<Archetype state={baseState({})} />);
      const pageUnit = i18n.t("tasks:detail.points.total", { count: 4242 });
      if (slug === "albescent") {
        expect(html, "the prism ring keeps the page's key").toContain(pageUnit);
        expect(pageUnit, "the catalog holds sentence case").toBe("Points");
        expect(enclosingTag(html, pageUnit), "the ring lost the shout").toContain(
          "text-transform:uppercase",
        );
        return;
      }
      expect(html, `${slug} re-grew a hand-drawn unit`).not.toContain(pageUnit);
      // Anchor on the figure: each stamp words its unit differently, or not at all.
      expect(html, `${slug} lost the worth cell`).toContain("4242");
    });

    it(`${slug} renders the signup CTA when canSignUp`, () => {
      const { text } = render(
        <Archetype state={baseState({ canSignUp: true })} />,
      );
      // Either vocabulary satisfies the slot (voiced CTA or ADR-0057 "Sign up").
      const lower = text.toLowerCase();
      expect(
        lower.includes("earn up to") || lower.includes("sign up"),
        "signup-CTA slot",
      ).toBe(true);
    });

    it(`${slug} renders the my-submission control`, () => {
      const { html } = render(
        <Archetype state={baseState({ mySubmission: MY_PRAXIS })} />,
      );
      // #1397: the read page; `/edit` bounces a submitted praxis back.
      expect(html, "my-submission slot").toContain('href="/praxis/55"');
    });

    it(`${slug} still draws ONE submitted link once the wire names it too`, () => {
      // #2643: the CTA could resolve to its own read link; `shared.tsx` stands
      // it down when `state.mySubmission` is set.
      const { html } = render(
        <Archetype
          state={baseState({
            mySubmission: MY_PRAXIS,
            task: { ...TASK, submitted_praxis_id: 55 },
          })}
        />,
      );
      expect(
        html.match(/href="\/praxis\/55"/g)?.length,
        "exactly one way in, not two",
      ).toBe(1);
    });

    it(`${slug} renders the continue control while in progress`, () => {
      const { html } = render(
        <Archetype
          state={baseState({ isInProgress: true, inProgressPraxisId: 99 })}
        />,
      );
      expect(html, "continue-in-progress slot").toContain(
        'href="/praxis/99/edit"',
      );
    });

    /**
     * Drop is a live <button> and never struck through (#2215, #2214). Checked
     * on the whole render: `line-through` is wrong on any control here.
     */
    it(`${slug} draws drop as a button, not struck-through text`, () => {
      const { html } = render(
        <Archetype
          state={baseState({ isInProgress: true, inProgressPraxisId: 99 })}
        />,
      );
      const buttonLabels = [
        ...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g),
      ].map((match) => match[1].replace(/<[^>]*>/g, "").toLowerCase());
      expect(
        buttonLabels.some((label) => label.includes("drop")),
        "drop slot is a <button>, not inert text",
      ).toBe(true);
      expect(
        html,
        "a struck-through control reads as unavailable",
      ).not.toContain("line-through");
    });
  }
});
