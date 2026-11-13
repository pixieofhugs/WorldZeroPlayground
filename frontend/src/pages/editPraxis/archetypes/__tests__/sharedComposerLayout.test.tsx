/**
 * Shared composer layout seams (#1706): the toolbar's seven commands in design
 * order, and the Level pill and description on one row. Asserted on rendered
 * structure, not style constants.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import i18n from "../../../../i18n";
import { anEditPraxisState } from "../../../../test/fixtures";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";
import { BodyTextarea } from "../controls";
import { TaskSlip } from "../shared";

const bodyState = anEditPraxisState();

/** By accessible name, not glyph: a skin may redraw the glyph. */
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
    // Buttons only; the toolbar has its own aria-label.
    const labels = [...markup.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(labels).toEqual(TOOLBAR_ROSTER);
  });
});

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
  // Real score terms for the default ScoreStamp (#1828), which dispatches on faction.
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
  // The slip title is a Link (#1705); MemoryRouter adds no markup.
  const renderSlip = (task: TaskOut) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <TaskSlip praxis={slipPraxis} task={task} />
      </MemoryRouter>,
    );

  it("sets the description beside the level pill, not under it", () => {
    const markup = renderSlip(slipTask);
    const level = i18n.t("forms:editPraxis.composer.levelLabel", { level: 1 });
    // Pill and description are siblings in one flex row.
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
    expect(markup).not.toContain("<p");
  });

  // The mark defaults to the FACTION's ScoreStamp, not the na one (#1828).
  it("marks the slip with the faction's own score stamp when none is passed", () => {
    const markup = renderSlip(slipTask);
    // WowScoreStamp's plaque token, so this checks the dispatch too.
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
