/**
 * The task slip's measure on a narrow sheet (#1961). Each row is a fixed half
 * (score mark, level pill) beside the task's copy, so on a phone the copy shaved
 * to ~145px. Both rows wrap at one shared measure; a basis on one row alone
 * moves the gutter. Read off inline styles (no layout here).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import "../../../../i18n";
import type { PraxisOut } from "../../../../api/praxis";
import type { TaskOut } from "../../../../api/tasks";
import { TaskSlip } from "../shared";

const DESCRIPTION =
  "Split into teams. Go to a public place and try to get high fives off as " +
  "many strangers as possible. Score a point for each one.";

const task = {
  id: 7,
  title: "High Fives",
  description: DESCRIPTION,
  point_value: 15,
  level_required: 1,
} as unknown as TaskOut;

const praxis = {
  id: 55,
  task_id: 7,
  task_title: "High Fives",
  task_faction_slug: "coven",
  moderation_status: "visible",
  is_top_for_task: false,
  task_point_value: 15,
  metatask_points: 0,
  display_multiplier: 1,
  points_from_votes: 0,
  habit_bonus_points: 0,
  score: 15,
} as unknown as PraxisOut;

const markup = renderToStaticMarkup(
  <MemoryRouter>
    <TaskSlip praxis={praxis} task={task} />
  </MemoryRouter>,
);

/** Every inline style in the slip, in document order. */
const styles = [...markup.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
/** The first two are the slip's outer row and the text column inside it. */
const [outerRow, textColumn] = styles;
const description = /<p style="([^"]*)"/.exec(markup)?.[1] ?? "";

/** The length in a `flex: <grow> <shrink> <basis>` shorthand, in px. */
function basisPx(style: string): number {
  const flex = /(?:^|;)flex:([^;]*)/.exec(style)?.[1];
  const px = flex && /(\d+(?:\.\d+)?)px\s*$/.exec(flex.trim());
  return px ? Number(px[1]) : NaN;
}

describe("task slip measure", () => {
  it("lets the mark drop under the copy rather than shave it", () => {
    expect(outerRow).toContain("flex-wrap:wrap");
  });

  it("gives the text column a length basis, so the wrap has a threshold", () => {
    // `flex: 1` and `flex: 1 1 0` never wrap.
    expect(basisPx(textColumn)).toBeGreaterThan(0);
  });

  it("wraps the description off the level pill at that same measure", () => {
    // A % basis measures the container, not a readable measure.
    expect(description).not.toContain("%");
    expect(basisPx(description)).toBe(basisPx(textColumn));
  });
});
