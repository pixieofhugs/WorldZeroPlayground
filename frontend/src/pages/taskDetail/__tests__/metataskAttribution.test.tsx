/**
 * One metatask, one faction statement (#2282). `primary_faction_slug` is `na` on
 * every player-proposed metatask; `metatask_faction_slug` is the issuer. The page
 * printed both. Asserted per skin, each paired with the slug that dispatches to
 * it (other pairings are states the router cannot produce).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import type { TaskDetailState } from "../useTaskDetail";
import { aTask } from "../../../test/fixtures";
import { factionName } from "../../../utils/factions";
import type { TaskOut } from "../../../api/tasks";
import i18n from "../../../i18n";

const ISSUER = "wow";

const issuerLine = i18n.t("tasks:detail.metataskIssuer", {
  faction: factionName(ISSUER),
});

function baseState(task: TaskOut): TaskDetailState {
  return {
    loading: false,
    task,
    fetchError: null,
    comments: null,
    submissions: [],
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: false,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 18,
    factionMultiplier: 1.0,
    modifiedPoints: 18,
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
  };
}

function render(element: ReactElement): string {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return html.replace(/<[^>]*>/g, "");
}

const archetypes = { ...surfaceMap("taskDetail"), __default__: DefaultTaskDetail };

const dispatchSlug = (key: string) => (key === "__default__" ? "na" : key);

function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe("metatask attribution (#2282)", () => {
  for (const [key, Archetype] of Object.entries(archetypes)) {
    const slug = dispatchSlug(key);

    it(`${key} labels the metatask faction as the issuer`, () => {
      const task = aTask({
        id: 162,
        title: "Do the task in space",
        task_type: "metatask",
        primary_faction_slug: slug,
        metatask_faction_slug: ISSUER,
      });
      const text = render(<Archetype state={baseState(task)} />);
      expect(text, "who issued it, said as issuance").toContain(issuerLine);
    });

    it(`${key} keeps naming a standard task's own faction, unlabelled`, () => {
      // Scoped to metatasks: no skin's nameplate is emptied.
      const task = aTask({ primary_faction_slug: slug });
      const text = render(<Archetype state={baseState(task)} />);
      expect(text).toContain(factionName(slug));
      expect(text).not.toContain(issuerLine);
    });
  }
});

/**
 * Derived, not hardcoded to `na`: masked Albescent also reads as unaffiliated
 * (ADR-0027) and must take this branch too, or the missing word is the tell.
 */
const GENERIC = Object.entries(archetypes).filter(
  ([key]) => factionName(dispatchSlug(key)) === factionName("na"),
);

describe("a generic metatask names exactly one faction (#2282)", () => {
  for (const [key, Archetype] of GENERIC) {
    const task = aTask({
      id: 162,
      title: "Do the task in space",
      task_type: "metatask",
      primary_faction_slug: dispatchSlug(key),
      metatask_faction_slug: ISSUER,
    });

    it(`${key} states the issuer and nothing else`, () => {
      const text = render(<Archetype state={baseState(task)} />);
      expect(text, "the issuer, labelled").toContain(issuerLine);
      expect(occurrences(text, factionName(ISSUER)), "named once").toBe(1);
    });

    it(`${key} does not print the sentinel as a second, competing faction`, () => {
      const text = render(<Archetype state={baseState(task)} />);
      expect(
        text,
        "the generic sentinel is the absence of a faction, not one this task belongs to",
      ).not.toContain(factionName("na"));
    });
  }
});
