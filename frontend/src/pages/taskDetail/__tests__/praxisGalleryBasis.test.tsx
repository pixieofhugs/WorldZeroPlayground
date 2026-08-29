/**
 * The task-detail praxis gallery constrains the card basis (#1137).
 *
 * A task detail mounts the SAME `<PraxisCard>` the `/praxes` feed does — one
 * responsive component per faction since ADR-0067 — and the card carries its own
 * `flex` basis. On the feed that basis is the whole layout; inside a task page it
 * is a transplanted feed card, so few fit per row and the gallery reads as
 * somebody else's list dropped in.
 *
 * The fix is a CONSTRAINT AT THE MOUNT, not a second card: `frameBase` takes its
 * basis from `--praxis-card-basis` (defaulting to the feed's 394px), and the
 * eight task-detail galleries set that variable via `.praxis-gallery`. So the
 * seam this file pins is exactly two facts:
 *
 *  1. every registered task-detail archetype's gallery carries `.praxis-gallery`;
 *  2. `frameBase` actually READS the variable, and its fallback is still the
 *     feed's 394px — which is what leaves `/praxes`, the profile and the faction
 *     pages byte-identical, since none of them sets the variable.
 *
 * Drop either and the other is decorative: a class nobody reads, or a variable
 * nobody sets.
 *
 * #1897 added a third fact: the gallery also CAPS its children. `frameBase`
 * carries `flex-grow: 1`, so a task with exactly one praxis had that card
 * stretch across the whole row — one card should look like one of three.
 *
 * #2229 refined that cap without reversing it. It was `var(--praxis-card-basis)`,
 * which made one number answer two questions; it is now a flat 50%, so the
 * variable means only "where the row wraps" and the cap means only "how much of
 * the row one card may take". The pair is the fourth fact this file pins.
 *
 * CEILING (`renderToStaticMarkup`, no jsdom, no layout, no computed styles):
 * this cannot prove a card got smaller, that three land in a row, or that a skin
 * is not cramped. Those are visual QA. It proves the wiring is connected.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { describe, it, expect } from "vitest";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import { surfaceMap } from "../../../factions";
import DefaultTaskDetail from "../archetypes/DefaultTaskDetail";
import { frameBase } from "../../../components/praxisCard/desktop/shared";
import type { TaskDetailState } from "../useTaskDetail";
import type { PraxisCardOut } from "../../../api/praxis";
import { aTask } from '../../../test/fixtures'
import { readIndexCss } from "../../../test/indexCss";

const TASK = aTask({
  title: "Reforestation",
  description: "Mangrove",
  point_value: 30,
  level_required: 3,
  created_by: 3,
  primary_faction_slug: "snide",
  created_by_display_name: "",
});

/** Four filed praxis — one past the 3-card preview, so the gallery is populated. */
const PRAXIS: PraxisCardOut[] = [1, 2, 3, 4].map((n) => ({
  id: n,
  task_id: 7,
  task_title: TASK.title,
  task_point_value: 30,
  task_level_required: 3,
  type: "solo",
  status: "submitted",
  title: `Seedlings ${n}`,
  moderation_status: "visible",
  created_by_id: 40 + n,
  created_by_display_name: `Planter ${n}`,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  submitted_at: "2026-01-02T00:00:00Z",
  member_count: 1,
  score: 5 - n,
  voter_count: 0,
  metatask_points: 0,
  display_multiplier: 1.0,
  points_from_votes: 0,
  habit_bonus_points: 0,
  is_top_for_task: false,
  applied_metatasks: [],
  body_text: null,
  created_by_avatar_url: "",
  created_by_faction_slug: null,
  duel_id: null,
  media_items: [],
  members: [],
  opponent_display_name: null,
  opponent_faction_slug: null,
  opponent_avatar_url: "",
  opponent_praxis_id: null,
  submit_proposed_at: null,
  viewer_can_vote: true,
  viewer_vote: null,
  voted_by_name: null,
  task_faction_slug: "snide",
}));

function baseState(overrides: Partial<TaskDetailState> = {}): TaskDetailState {
  return {
    loading: false,
    task: TASK,
    fetchError: null,
    submissions: PRAXIS,
    comments: null,
    friends: new Set(),
    foes: new Set(),
    mySubmission: undefined,
    isInProgress: false,
    inProgressPraxisId: null,
    canSignUp: false,
    levelJumpSignup: false,
    slotsOpen: 2,
    maxTaskSlots: 3,
    basePoints: 30,
    factionMultiplier: 1.0,
    modifiedPoints: 30,
    inProgressCount: 0,
    topScore: 0,
    voteCount: 0,
    submissionSort: "score",
    setSubmissionSort: () => {},
    sortedSubmissions: PRAXIS,
    signupError: null,
    handleSignup: async () => {},
    handleDrop: async () => {},
    dropConfirm: null,
    ...overrides,
  };
}

function render(element: ReactElement): string {
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>);
}

// The Default fallback is a renderable surface too — guard it with the registry.
const archetypes = { ...surfaceMap("taskDetail"), __default__: DefaultTaskDetail };

const css = stripComments(
  readIndexCss(),
);

describe("task-detail praxis gallery basis (#1137)", () => {
  for (const [slug, Archetype] of Object.entries(archetypes)) {
    it(`${slug} wraps its praxis gallery in .praxis-gallery`, () => {
      const html = render(<Archetype state={baseState()} />);
      expect(html, "gallery constraint class").toContain("praxis-gallery");
    });
  }

  it("the card frame reads the variable the gallery sets", () => {
    expect(frameBase.flex).toContain("var(--praxis-card-basis");
  });

  it("the card frame still falls back to the feed's 394px basis", () => {
    // Nothing outside `.praxis-gallery` sets the variable, so `/praxes`, the
    // character profile and the faction pages render exactly as before.
    expect(frameBase.flex).toContain("394px");
  });
});

describe("a lone praxis card takes half the row (#1897, refined by #2229)", () => {
  const capped = ruleBodies(css, ".praxis-gallery > *");
  const gallery = ruleBodies(css, ".praxis-gallery");

  it("the gallery caps its children at half the row", () => {
    // `frameBase` is `flex: 1 1 var(--praxis-card-basis)` — the leading grow is
    // why a single card ate the whole row (#1897). #2229 keeps that cap and
    // changes its VALUE: 320px in a full-width row clamped a lone card to
    // something that read as squished, so the cap is a fraction of the row.
    expect(capped.length, ".praxis-gallery > * rule must exist").toBeGreaterThan(0);
    for (const body of capped) {
      expect(body).toMatch(/max-width\s*:\s*50%/);
    }
  });

  it("the cap no longer reads the wrap basis", () => {
    // The two numbers answer different questions, and #2229 separated them: the
    // basis says where the row WRAPS, the cap says how wide a lone card may
    // grow. Re-pointing the cap at the variable re-couples them.
    for (const body of capped) {
      expect(body).not.toMatch(/--praxis-card-basis/);
    }
  });

  it("leaves the wrap basis at 320px", () => {
    // Unchanged by #2229 on purpose: three cards still wrap where they did, and
    // a 50% cap cannot bite three items that each hold under half a row.
    expect(gallery.length, ".praxis-gallery rule must exist").toBeGreaterThan(0);
    expect(gallery.join("\n")).toMatch(/--praxis-card-basis\s*:\s*320px/);
  });

  it("leaves the card's 280px phone floor alone", () => {
    // ACCEPTANCE, not an oversight: `min-width` beats `max-width`, so under a
    // 320px viewport the card still renders at 280, one per row — a percentage
    // cap cannot crush it either. The cap must not restate or lower that floor.
    expect(frameBase.minWidth).toBe(280);
    for (const body of capped) {
      expect(body).not.toMatch(/min-width/);
    }
  });

  it("does not set width, which would fight the card's inline style", () => {
    // `max-width` was chosen precisely because it clamps a flex item without a
    // specificity fight against `frameBase`'s inline `width: 100%`.
    for (const body of capped) {
      expect(body).not.toMatch(/(^|[\s;])width\s*:/);
    }
  });
});
