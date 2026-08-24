/**
 * Task-detail content-slot invariant guard (ADR-0002).
 *
 * Every per-faction task-detail archetype wears a wildly different skin (gilt
 * salon, ransom dossier, terminal printout, union poster…) but must render the
 * same CONTENT slots. The slots are convention-only — an archetype may *arrange*
 * them freely but may not *drop* one. This test walks the real
 * `surfaceMap('taskDetail')` registry (plus the Default fallback) and asserts every
 * registered archetype still emits the invariant slots. A new faction that drops
 * a slot fails here, so the guard scales free as factions are added.
 *
 * We render to static markup (no DOM, no context) and assert on the structural
 * anchors each slot leaves behind: slot text and the stable hrefs
 * (`/tasks`, `/praxis/:id`, `/praxis/:id/edit`). Distinctive fixture values keep the substring
 * checks from colliding with incidental markup. Submissions are left empty so
 * the test never has to mount the context-bound <PraxisCard> wrapper — the
 * praxis section is anchored instead by its heading, and PraxisCard composition
 * is guarded separately by factionCardSlots.test.tsx.
 *
 * The anchor used to be the sort toggle, on the grounds that it was always
 * present. #1704 made it conditional — a control that sorts nothing is not
 * drawn — so the anchor moved to the one part of the section that is
 * unconditional. Whether the toggle appears, and when, is pinned in
 * `detailContract.test.tsx`.
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

/**
 * The tag that DIRECTLY encloses the first occurrence of `text`, opening angle
 * bracket to closing one — so an assertion can ask what dress the element
 * carries, not merely whether the words are somewhere on the page.
 */
function enclosingTag(html: string, text: string): string {
  const at = html.indexOf(`>${text}<`);
  expect(at, `"${text}" is not rendered as an element's whole content`).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), at + 1);
}

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
  // Tag-stripped text — several archetypes split the title across spans (SNIDE's
  // ransom-note fragments, the Ephemerists' lapis last-word), so the title slot
  // only reads contiguously once the wrapping tags are removed.
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

/** Base state — every flag off; scenarios override what they exercise. */
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

// Default fallback is a registered renderable too — guard it alongside the map.
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
      // Praxis gallery: every archetype heads it with the shared count copy.
      expect(text, "praxis-gallery slot").toContain("completed praxis");
    });

    // #2598. `tasks:detail.points.total` used to be stored as "POINT"/"POINTS",
    // pre-shouted, while only five of the nine skins uppercased it in CSS — so
    // on the other four the caps in the catalog value were the only thing
    // shouting, and on all nine an editor could not tell whether they were the
    // design or the copy.
    //
    // The catalog holds "Point"/"Points" now and the shout moved to the element.
    // Five skins already carried the transform (Everymen's `label`, the
    // Ephemerists' `SMALL_CAPS`, UA's `UA_EYEBROW`, Coven's `CAPTION`,
    // Singularity's `LABEL`); four gained it (Wow, Default, S.N.I.D.E. via
    // `PenCircle`'s opt-in, Albescent over `.label-caption`'s explicit
    // `text-transform: none`). Rendering is unchanged in a browser.
    //
    // This is the half a catalog check cannot do: downcasing the value is only
    // safe while the element still shouts, and losing the transform is silent.
    it(`${slug} shouts the points unit in CSS, not in the catalog`, () => {
      const unit = i18n.t("tasks:detail.points.total", { count: 4242 });
      expect(unit, "the catalog holds sentence case").toBe("Points");
      const { html } = render(<Archetype state={baseState({})} />);
      expect(enclosingTag(html, unit), `${slug} lost the shout`).toContain(
        "text-transform:uppercase",
      );
    });

    it(`${slug} renders the signup CTA when canSignUp`, () => {
      const { text } = render(
        <Archetype state={baseState({ canSignUp: true })} />,
      );
      // Two vocabularies coexist while C1–C8 (#1031–#1038) land. The faction
      // skins still speak their own voice and quote the points on the CTA
      // ("earn up to N pts"); a skin rebuilt on the shared neutral copy
      // (ADR-0057) says plainly "Sign up" and moves the points into the action
      // panel's base/×mult/total readout. Either satisfies the slot; an
      // archetype with no sign-up affordance at all satisfies neither.
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
      // #1397: the slot points at the READ page. `mySubmission` is submitted by
      // construction, and `/edit` bounces a submitted praxis straight back to
      // `/praxis/:id` — the button used to change nothing at all.
      expect(html, "my-submission slot").toContain('href="/praxis/55"');
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
     * The DROP slot is a live control, and it is not crossed out.
     *
     * Both halves were reported from production in one week. #2215 read the
     * word as inert text because clicking it did nothing (the cause was the
     * `window.confirm` behind it — see `useTaskDetail`), and #2214 read it as
     * unavailable because two skins struck it through. Neither is visible to a
     * `tsc` pass, and both are one careless line away from coming back, so the
     * shape of the control is asserted for every archetype here rather than in
     * the two skins that happened to get reported.
     *
     * `line-through` is checked against the whole in-progress render, not one
     * declaration: the mark is wrong on any control on this panel, whichever
     * skin reaches for it next.
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
