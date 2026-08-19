/**
 * ONE BREADCRUMB, EVERYWHERE (#2102).
 *
 * The report is a consistency bug, so the guard has to be a consistency guard:
 * a per-archetype assertion cannot catch "these eighteen disagree". This walks
 * the real `surfaceMap('taskDetail')` and `surfaceMap('praxisDetail')`
 * registries — plus each family's Default fallback — at BOTH form factors, and
 * asserts the same four things about all of them.
 *
 * What was actually wrong, and what each assertion below pins:
 *
 *   - Task detail drew a lone `Tasks` crumb with no trail after it and no
 *     landmark name. The report's words: "they are just text, not links.
 *     Clicking on the word Tasks does nothing."
 *   - Praxis detail drew a three-crumb trail on desktop and swapped it for a
 *     bespoke `mobileBar` — a `‹ Praxis` back link to a DIFFERENT destination —
 *     below 768px, in seven of nine skins. A navigation control that becomes a
 *     different control at a breakpoint is the same defect.
 *   - The separator was `·` in one skin, `/` in five, `›` in the composer.
 *
 * Harness: `renderToStaticMarkup`, no DOM, no effects (SPEC-testing.md), so
 * `useFormFactor` is mocked rather than driven off a viewport. The archetypes
 * are imported after the mock so they pick it up. Nothing here asserts a
 * WIDTH — the shared component has no breakpoint; the mobile pass exists to
 * prove the trail is unchanged by one.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import i18n from "../../i18n";
import { surfaceMap } from "../../factions";
import type { TaskDetailState } from "../taskDetail/useTaskDetail";
import type { PraxisDetailState } from "../praxisDetail/usePraxisDetail";
import { aPraxis, aTask } from "../../test/fixtures";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "desktop" | "mobile" }));
vi.mock("../../hooks/useFormFactor", () => ({
  useFormFactor: () => mocks.formFactor,
}));

const { default: DefaultTaskDetail } = await import("../taskDetail/archetypes/DefaultTaskDetail");
const { default: DefaultPraxisDetail } = await import(
  "../praxisDetail/archetypes/DefaultPraxisDetail"
);

const TITLE = "Race your shadow down the estuary path";

const TASK = aTask({
  id: 7,
  title: TITLE,
  description: "Mangrove",
  created_by: 3,
  primary_faction_slug: "snide",
  created_by_display_name: "",
});

const PRAXIS = aPraxis({
  id: 12,
  task_id: 7,
  task_title: TITLE,
  title: "Reforestation",
  body_text: "Seedlings planted along the estuary.",
  created_by_id: 3,
  created_by_display_name: "Ada",
  members: [],
  media_items: [],
});

function taskState(): TaskDetailState {
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
  };
}

function praxisState(): PraxisDetailState {
  return {
    loading: false,
    praxis: PRAXIS,
    fetchError: null,
    comments: null,
    voters: [],
    duel: null,
    isOwner: false,
    showAdminBar: false,
    user: null,
    withdrawing: false,
    showWithdrawConfirm: false,
    setShowWithdrawConfirm: () => {},
    withdrawError: null,
    adminFailNote: "",
    setAdminFailNote: () => {},
    showFailInput: false,
    setShowFailInput: () => {},
    moderating: false,
    moderateError: null,
    showFlagForm: false,
    setShowFlagForm: () => {},
    flagReason: null,
    setFlagReason: () => {},
    flagDetail: "",
    setFlagDetail: () => {},
    flagging: false,
    flagError: null,
    setFlagError: () => {},
    flagSubmitted: false,
    handleModerate: async () => {},
    handleWithdraw: async () => {},
    handleFlag: async () => {},
    handleKickMember: async () => {},
  };
}

const draw = (element: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);

const LABEL = i18n.t("breadcrumb.label", { ns: "common" });

/** The `<nav>` the shared component draws — and only it. */
function trailOf(html: string): string {
  const open = html.indexOf(`aria-label="${LABEL}"`);
  expect(open, "the page draws no breadcrumb landmark at all").toBeGreaterThan(-1);
  const start = html.lastIndexOf("<nav", open);
  return html.slice(start, html.indexOf("</nav>", start));
}

const WIDTHS = ["desktop", "mobile"] as const;

const FAMILIES = [
  {
    family: "taskDetail",
    archetypes: { ...surfaceMap("taskDetail"), __default__: DefaultTaskDetail },
    render: (A: (props: { state: TaskDetailState }) => ReactElement | null) =>
      draw(<A state={taskState()} />),
    /** The task IS the page, so it is the last crumb and not a link. */
    linked: ['href="/tasks"'],
    unlinked: ['href="/tasks/7"'],
  },
  {
    family: "praxisDetail",
    archetypes: { ...surfaceMap("praxisDetail"), __default__: DefaultPraxisDetail },
    render: (A: (props: { state: PraxisDetailState }) => ReactElement | null) =>
      draw(<A state={praxisState()} />),
    /** The praxis is the page; the bank and the task above it are links. */
    linked: ['href="/tasks"', 'href="/tasks/7"'],
    unlinked: ['href="/praxis/12"'],
  },
] as const;

beforeEach(() => {
  mocks.formFactor = "desktop";
});

for (const spec of FAMILIES) {
  describe(`${spec.family} — the shared breadcrumb`, () => {
    for (const [slug, Archetype] of Object.entries(spec.archetypes)) {
      for (const width of WIDTHS) {
        it(`${slug} draws exactly one, unchanged, on ${width}`, () => {
          mocks.formFactor = width;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the two families take two different state types; the loop is over both.
          const html = spec.render(Archetype as any);

          expect(
            html.split(`aria-label="${LABEL}"`).length - 1,
            "one trail on the page — not a second one inside the sheet",
          ).toBe(1);

          const trail = trailOf(html);
          for (const href of spec.linked) {
            expect(trail, `${href} is a level above; it must be a real link`).toContain(href);
          }
          for (const href of spec.unlinked) {
            expect(trail, `${href} is the page you are on; it is not a link to itself`)
              .not.toContain(href);
          }
          expect(trail, "the current page says so").toContain('aria-current="page"');
          expect(trail, "the trail ends at the thing you are looking at").toContain(TITLE);

          // ONE separator, and it is the composer's chevron.
          expect(trail, "a `·` separator is one of the three the report caught")
            .not.toMatch(/>\s*·\s*</);
          expect(trail, "and a `/` is another").not.toMatch(/>\s*\/\s*</);
          expect(trail).toContain("›");

          // No second navigation control at the breakpoint: the phone bar's
          // back link pointed at /praxis, which is not even on this trail.
          expect(html, "the bespoke mobileBar is gone").not.toContain('href="/praxis"');
        });
      }
    }
  });
}
