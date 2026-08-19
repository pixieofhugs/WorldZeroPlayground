/**
 * One metatask, ONE faction statement (#2282).
 *
 * A metatask carries two real faction columns and the page printed both as if
 * they were one answer:
 *
 *  - `primary_faction_slug` — every task has one, `na` for the generic
 *    cross-faction case. The propose-a-metatask form never sets it (it POSTs
 *    `metatask_faction_slug` only — `planProposalSubmission`), so EVERY metatask
 *    a player creates carries `na` here, and `na` printed as "Unaffiliated".
 *  - `metatask_faction_slug` — who ISSUED the metatask. `faction_permits`
 *    documents that this gates nothing: metatasks are faction-open, any
 *    character may apply any faction's metatask.
 *
 * Task 162 in production therefore claimed to be both *Unaffiliated* and
 * *Warriors of Whimsy*. Neither column is wrong; the presentation was.
 *
 * The seam is the archetype: nine skins draw this header, each in its own
 * markup, so the rule is asserted per skin rather than only at the shared
 * decision they now route through (`headerFactionName`).
 *
 * **Each skin is paired with the slug that dispatches to it** (`TaskDetail`
 * picks the archetype off `primary_faction_slug`). Rendering the Coven skin
 * with an `na` task is a state the router cannot produce, and asserting on it
 * would be asserting on fiction — the Ephemerists band, for one, sets the
 * wordmark from that same slug.
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

/** The issuer of the reported metatask (#2282, task 162). */
const ISSUER = "wow";

/** The one labelled faction statement a metatask header may make. */
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

/** The slug that routes to this skin — `__default__` is the na reference page. */
const dispatchSlug = (key: string) => (key === "__default__" ? "na" : key);

/** How many times a word appears: "one statement" is a count, not a flag. */
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
      // The rule is scoped to metatasks: a standard task's header still answers
      // "whose task is this", and no faction skin's nameplate is ever emptied.
      const task = aTask({ primary_faction_slug: slug });
      const text = render(<Archetype state={baseState(task)} />);
      expect(text).toContain(factionName(slug));
      expect(text).not.toContain(issuerLine);
    });
  }
});

/**
 * The reported case, and the only one the propose form can create: a metatask
 * whose own faction is the generic sentinel.
 *
 * Derived, not hardcoded to `na`: Albescent's page is `Default` under a wash
 * and `factionName` masks that slug to the unaffiliated word until the viewer
 * has been shown the society (ADR-0027, ADR-0048), so it reaches this branch
 * too — and must, or the missing word would be the tell.
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
