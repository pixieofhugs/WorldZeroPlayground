/**
 * The shared composer's LAYOUT seams (#1706).
 *
 * Two of the composer's regions are drawn once and inherited by all eight
 * skins, so their arrangement is a property of `controls.tsx` / `shared.tsx`
 * and not of any faction. This pins the two the design and the code disagreed
 * on:
 *
 *  - the markdown toolbar's ROSTER — seven commands, in the design's order;
 *  - the task slip's second line — the Level pill and the task's description
 *    on ONE row, rather than the description stacked under the pill.
 *
 * Both are layout claims, so both are asserted against the rendered structure
 * rather than against a style constant an implementation could restate.
 *
 * renderToStaticMarkup needs no DOM, matching the rest of this suite.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import type { EditPraxisState } from "../../useEditPraxis";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";
import { BodyTextarea } from "../controls";
import { TaskSlip } from "../shared";

/* ── the toolbar roster ─────────────────────────────────────────────────── */

// BodyTextarea reads only `body` / `setBody` off the state.
const bodyState = {
  body: "## What I did\n\nCaught the papers.",
  setBody: () => {},
} as unknown as EditPraxisState;

/**
 * The design's seven, in order. Named by their accessible names rather than
 * their glyphs: the glyph is dress (a skin may redraw `❝`), the command is not.
 */
const TOOLBAR_ROSTER = [
  i18n.t("forms:editPraxis.toolbar.bold"),
  i18n.t("forms:editPraxis.toolbar.italic"),
  i18n.t("forms:editPraxis.toolbar.heading"),
  i18n.t("forms:editPraxis.toolbar.blockquote"),
  i18n.t("forms:editPraxis.toolbar.unorderedList"),
  i18n.t("forms:editPraxis.toolbar.orderedList"),
  i18n.t("forms:editPraxis.toolbar.link"),
];

describe("markdown toolbar roster", () => {
  it("draws the design's seven commands, in order", () => {
    const markup = renderToStaticMarkup(
      <BodyTextarea {...bodyState} skin={{ textareaStyle: {} }} />,
    );
    // Buttons only — the toolbar element carries an aria-label of its own.
    const labels = [...markup.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(labels).toEqual(TOOLBAR_ROSTER);
  });
});

/* ── the task slip's second line ────────────────────────────────────────── */

const DESCRIPTION = "Do a small honest thing.";

const slipTask = {
  id: 7,
  title: "A Very Human Thing",
  description: DESCRIPTION,
  point_value: 20,
  level_required: 1,
} as unknown as TaskOut;

const slipPraxis = {
  id: 55,
  task_id: 7,
  task_title: "A Very Human Thing",
  // The slip's default mark is the shared ScoreStamp (#1828), which reads the
  // score terms and dispatches on the task's faction — so the fixture carries a
  // real payload rather than leaving the stamp to the `?? 0` defensive path.
  task_faction_slug: "wow",
  moderation_status: "visible",
  is_top_for_task: false,
  task_point_value: 20,
  metatask_points: 0,
  display_multiplier: 1,
  points_from_votes: 0,
  habit_bonus_points: 0,
  score: 20,
} as unknown as PraxisOut;

describe("task slip", () => {
  // #1705 made the slip title a Link, so the slip now needs router context.
  // MemoryRouter adds no markup of its own, so the assertions below are
  // unchanged by it — they still read the slip's own structure.
  const renderSlip = (task: TaskOut) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <TaskSlip praxis={slipPraxis} task={task} />
      </MemoryRouter>,
    );

  it("sets the description beside the level pill, not under it", () => {
    const markup = renderSlip(slipTask);
    const level = i18n.t("forms:editPraxis.composer.levelLabel", { level: 1 });
    // One flex row opening immediately before the pill and closing straight
    // after the description: the two are siblings on a line of their own.
    expect(markup).toMatch(
      new RegExp(
        `<div style="display:flex[^"]*"><div style="[^"]*">${level}</div><p style="[^"]*">${DESCRIPTION}</p></div>`,
      ),
    );
  });

  it("still draws the pill when the task has no description", () => {
    const markup = renderSlip({ ...slipTask, description: "" });
    expect(markup).toContain(
      i18n.t("forms:editPraxis.composer.levelLabel", { level: 1 }),
    );
    // An empty description must not spend a paragraph's worth of the row.
    expect(markup).not.toContain("<p");
  });

  /* ── the slip's mark (#1828) ─────────────────────────────────────────────
   * The mark defaults to the shared `ScoreStamp` rather than to a composer-only
   * points device per faction. That is one claim with two halves, and both are
   * asserted: the stamp arrives unasked, and it is the FACTION's stamp — the
   * ornament seam is what survives here, so a default that flattened every skin
   * onto the na stamp would pass the first half alone. */
  it("marks the slip with the faction's own score stamp when none is passed", () => {
    const markup = renderSlip(slipTask);
    // WowScoreStamp's own plaque token — the na fall-through paints
    // `--faction-default-stamp-bg` instead, so this reads the dispatch too.
    expect(markup).toContain("--faction-wow-stamp-bg");
  });

  it("lets a caller pass a mark of its own instead", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <TaskSlip praxis={slipPraxis} task={slipTask} mark={<i>ornament</i>} />
      </MemoryRouter>,
    );
    expect(markup).toContain("<i>ornament</i>");
    expect(markup).not.toContain("--faction-wow-stamp-bg");
  });
});
