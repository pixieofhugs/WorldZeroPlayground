/**
 * The task slip's MEASURE on a narrow sheet (#1961).
 *
 * The slip is two rows, and each is [something fixed] beside [the task's own
 * borrowed copy]: the score mark against the text column, and the level pill
 * against the description. Both fixed halves keep their width whatever the
 * sheet does — the mark is `flexShrink: 0, minWidth: 118` and the pill is
 * `flexShrink: 0` — so on a phone the copy was the only thing left to shave. It
 * shaved down to about 145px, three words to a line, with the mark's column
 * standing empty beside twenty lines of description. That is the "ton of empty
 * space on the right" the report is about.
 *
 * The fix is a wrap threshold on the copy in BOTH rows: below one measure the
 * copy takes the whole line and its fixed neighbour drops under it. The two
 * rows share the measure, which is the claim asserted here — a basis on one row
 * alone just moves the gutter to the other side of the pill.
 *
 * These are style values, not structure, and there is no layout in this
 * harness (renderToStaticMarkup, no DOM), so they are read off the rendered
 * inline styles. A geometric contract no reviewer can see is exactly the kind
 * that needs pinning; `sharedComposerLayout.test.tsx` pins the structure these
 * sit on, and that test still passes unchanged, which is the point — the rows
 * are the same rows.
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
    // `flex: 1` (basis auto) and `flex: 1 1 0` both never wrap — the column
    // just keeps giving width back to the mark.
    expect(basisPx(textColumn)).toBeGreaterThan(0);
  });

  it("wraps the description off the level pill at that same measure", () => {
    // A percentage basis measures the CONTAINER, so it wraps at whatever width
    // makes the pill half the column — which on a phone is far below a
    // readable measure, and on a wide sheet is never.
    expect(description).not.toContain("%");
    expect(basisPx(description)).toBe(basisPx(textColumn));
  });
});
