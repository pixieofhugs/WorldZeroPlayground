/**
 * The Ephemerists task detail — THE VALLEY PLATE (#1032).
 *
 * `archetypeSlots` already guards the content slots and `detailContract` the
 * three shared decisions, for this skin along with every other. What is left,
 * and what this file pins, is the stuff that is specific to rebuilding THIS
 * archetype and that a green tsc/eslint/vitest would otherwise say nothing
 * about:
 *
 *  1. The retired metaphor is actually gone. The 909-line "Discordant Map" and
 *     its faction voice (`credence`, `ephemerides`, `commission`, `puncta`,
 *     `triangulating`) were replaced, not wrapped — and ADR-0057 means none of
 *     the DESIGN's words ("in full", "Bonus", "Ally"/"Rival") arrived either.
 *  2. The Valley dress is present. A skin that rendered as unstyled boxes still
 *     passes every slot test; the masthead band, the incised glyph registers and
 *     the crowned panel leave stable markup hooks, so absence is detectable.
 *  3. The roster stayed dead. The design BUILDS a full roster section — octagon
 *     avatars, tally strokes, Ally/Rival tags, a "+N more players" row — and
 *     never mounts it. Owner ruling 2026-07-28 cut it for every skin, so this is
 *     the one place a future port-by-copying would reintroduce it.
 *  4. Every `--faction-ephemerists-plate-*` token this skin paints with is
 *     declared in BOTH themes. A token declared only in `:root` looks fine until
 *     someone flips to dark, and nothing else we run compares the two blocks by
 *     name.
 *
 * `sortedSubmissions` is left empty throughout: `<PraxisCard>` is the
 * context-bound wrapper and this harness has no DOM and runs no effects (the
 * gallery's own composition is guarded by factionCardSlots).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import EphemeristsTaskDetail from "../archetypes/EphemeristsTaskDetail";
import { surfaceMap } from "../../../factions";
import { resolvedArchetype } from "../../../factions/lazyArchetype";
import { readThemes } from "../../../utils/__tests__/cssVars";
import type { TaskDetailState } from "../useTaskDetail";
import type { TaskOut, TaskSignupOut } from "../../../api/tasks";

const TASK: TaskOut = {
  id: 305,
  title: "Catalogue every bench along the river walk",
  description: "Walk the water from the lock to the last lamp.",
  point_value: 30,
  level_required: 4,
  status: "active",
  task_type: "standard",
  created_by: 31,
  primary_faction_slug: "ephemerists",
  metatask_faction_slug: null,
  is_task_vision_eligible: false,
  created_at: "2026-01-01T00:00:00Z",
  in_progress_count: 9,
  created_by_display_name: "Wren Abalone",
  created_by_faction_slug: "ephemerists",
  created_by_level: 4,
  can_submit_praxis: true,
  allowed_modes: ["solo"],
  eligible_for_current_user: true,
};

const SIGNUP: TaskSignupOut = {
  character_id: 88,
  display_name: "Thessaly Vane",
  avatar_url: "",
  faction_slug: "ephemerists",
  level: 6,
  praxis_type: "solo",
  joined_at: "2026-01-03T00:00:00Z",
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
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 30,
    factionMultiplier: 1.0,
    modifiedPoints: 30,
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

describe("Ephemerists task detail — the Valley plate", () => {
  it("is what the manifest dispatches for the slug", () => {
    expect(resolvedArchetype(surfaceMap("taskDetail").ephemerists)).toBe(EphemeristsTaskDetail);
  });

  it("speaks only the shared neutral copy", () => {
    const { text } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(text).toContain("Task Description");
    expect(text).toContain("Discussion");
    // The breadcrumb is the shared "Tasks" crumb and nothing after it: #1124
    // retired `Task №{id}`, which was the trail's whole second crumb here (a
    // brass cartouche framing it).
    expect(text).toContain("Tasks");
    expect(text, "no task id in the breadcrumb").not.toContain("№");
    // ADR-0057: the retired Discordant Map voice.
    for (const retired of [
      "credence",
      "Ephemerides",
      "Cartographers",
      "Commission",
      "puncta",
      "triangulating",
    ]) {
      expect(text).not.toContain(retired);
    }
    // …and the design's own words, which are not authority either.
    for (const invented of ["in full", "Bonus", "Ally", "Rival", "Say something"]) {
      expect(text).not.toContain(invented);
    }
  });

  it("wears the Valley dress — masthead band, incised registers, crowned panel", () => {
    const { html, text } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html, "papyrus page sheet").toContain("eph-plate-sheet");
    expect(html, "cornice masthead band").toContain("--faction-ephemerists-plate-band");
    expect(html, "incised glyph registers").toContain("epg-glyph");
    expect(html, "the disc crowning the action panel").toContain("eph-plate-crown");
    expect(html, "the stepped octagon medallion").toContain("M30 4 L70 4 L96 30");
    expect(text, "the masthead wordmark").toContain("The Ephemerists");
    // The codex ground belongs to the OTHER Ephemerists surfaces now.
    expect(html, "retired illuminated-codex ground").not.toContain("--eph-vellum");
  });

  it("renders no in-progress roster, only the header count", () => {
    const { text } = render(
      <EphemeristsTaskDetail state={baseState({ signups: [SIGNUP] })} />,
    );
    expect(text).not.toContain("Thessaly Vane");
    expect(text).toContain("In progress");
    expect(text).toContain("9");
  });

  it("hides the modifier row at the identity factor and shows it off it", () => {
    const neutral = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(neutral.text).not.toContain("×");
    expect(neutral.text, "the base is legible regardless").toContain("30");

    const modified = render(
      <EphemeristsTaskDetail
        state={baseState({ factionMultiplier: 1.25, modifiedPoints: 38 })}
      />,
    );
    expect(modified.text).toContain("×1.25");
    expect(modified.text).toContain("38");
  });

  it("draws the brief in full — no clamp, no read-more", () => {
    const long = "x".repeat(2000);
    const { text } = render(
      <EphemeristsTaskDetail
        state={baseState({ task: { ...TASK, description: long } })}
      />,
    );
    expect(text).toContain(long);
  });

  it("never links the gallery out at the task_id feed filter", () => {
    // The gallery expands in place instead (#1030's fix, inherited here) — the
    // reader stays on the task, even now that the URL filters (#1050).
    const { html } = render(<EphemeristsTaskDetail state={baseState()} />);
    expect(html).not.toContain("task_id=");
  });
});

describe("the Valley plate's tokens", () => {
  const themes = readThemes(
    readFileSync(fileURLToPath(new URL("../../../index.css", import.meta.url)), "utf8"),
  );
  const source = readFileSync(
    fileURLToPath(new URL("../archetypes/EphemeristsTaskDetail.tsx", import.meta.url)),
    "utf8",
  );
  const referenced = [
    ...new Set(source.match(/--faction-ephemerists-plate-[\w-]+/g) ?? []),
  ];

  it("names at least the whole plate family", () => {
    expect(referenced.length).toBeGreaterThan(10);
  });

  for (const token of referenced) {
    it(`${token} is declared in both themes`, () => {
      expect(themes.light.has(token), "light / :root").toBe(true);
      expect(themes.dark.has(token), '[data-theme="dark"]').toBe(true);
    });
  }
});
