/**
 * One metatask, ONE faction statement (#2282).
 *
 * A metatask carries two real faction columns and the page used to print both
 * as if they were one answer:
 *
 *  - `primary_faction_slug` — every task has one, `na` for the generic
 *    cross-faction case. The propose-a-metatask form never sets it (it POSTs
 *    `metatask_faction_slug` only), so EVERY metatask a player creates is `na`
 *    here — and `na` printed in the header as "Unaffiliated".
 *  - `metatask_faction_slug` — who ISSUED the metatask. `faction_service`'s
 *    `faction_permits` documents that this gates nothing: metatasks are
 *    faction-open, any character may apply any faction's metatask.
 *
 * Task 162 in production therefore claimed to be both *Unaffiliated* and
 * *Warriors of Whimsy*. Neither column is wrong; the presentation was.
 *
 * The seam is the archetype: nine skins draw this header and each draws its own
 * markup, so the rule is asserted per archetype rather than at the one shared
 * helper they now route the decision through (`headerFactionName`).
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
import i18n from "../../../i18n";

/** The reported shape: generic task, issued by WOW (#2282, task 162). */
const METATASK = aTask({
  id: 162,
  title: "Do the task in space",
  task_type: "metatask",
  primary_faction_slug: "na",
  metatask_faction_slug: "wow",
});

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: METATASK,
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
    ...overrides,
  };
}

function render(element: ReactElement): string {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  return html.replace(/<[^>]*>/g, "");
}

const archetypes = { ...surfaceMap("taskDetail"), __default__: DefaultTaskDetail };

/** How many times a word appears — "exactly one statement" is a count, not a flag. */
function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe("metatask attribution (#2282)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} names the issuing faction once, and labels it as issuance`, () => {
      const text = render(<Archetype state={baseState()} />);
      expect(
        text,
        "the issuing faction, labelled for the question it answers",
      ).toContain(
        i18n.t("tasks:detail.metataskIssuer", { faction: factionName("wow") }),
      );
      expect(occurrences(text, factionName("wow")), "named once").toBe(1);
    });

    it(`${slug} does not print the na sentinel as a second, competing faction`, () => {
      const text = render(<Archetype state={baseState()} />);
      expect(text, "the generic sentinel is not a faction this task belongs to")
        .not.toContain(factionName("na"));
    });

    it(`${slug} keeps naming a standard task's own faction`, () => {
      // The rule is scoped to metatasks: a standard task's header still answers
      // "whose task is this", and a faction skin's nameplate is never emptied.
      const task = aTask({ primary_faction_slug: "wow" });
      const text = render(<Archetype state={baseState({ task })} />);
      expect(text).toContain(factionName("wow"));
      expect(text).not.toContain(
        i18n.t("tasks:detail.metataskIssuer", { faction: factionName("wow") }),
      );
    });
  }
});
