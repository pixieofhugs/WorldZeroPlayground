/**
 * The seal's corner and the picker's selection ring read ONE token (#2729).
 *
 * The seam is the pair, not either half: the ring is drawn on the picker row's
 * control and the corner on the skin inside it, and the defect was that the two
 * were separate literals — a hardcoded `borderRadius: 12` on the row against a
 * `borderRadius: 4` Singularity seal, so a 14px arc drawn 2px outside a 4px
 * corner passed *inside* the card and vanished behind it.
 *
 * So both halves are asserted against the SAME `--faction-<slug>-card-radius`
 * name. A literal on either side fails here, and no literal can agree with the
 * other side by accident again.
 *
 * The ring's INK (`-card-accent`) is not asserted: it is emitted only for the
 * selected row, `pending` is internal state, and this harness is DOM-less
 * (`renderToStaticMarkup`, no clicks). It is a ternary written on the line
 * below the radius that is covered.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";

import MetataskSeal from "../MetataskSeal";
import MetataskPicker from "../MetataskPicker";
import type { EditPraxisState } from "../../../pages/editPraxis/useEditPraxis";
import type { TaskOut } from "../../../api/tasks";

function metatask(slug: string): TaskOut {
  return {
    id: 7,
    title: "do it underwater. no cuts.",
    description: "",
    point_value: 50,
    level_required: 0,
    status: "active",
    task_type: "metatask",
    created_by: 1,
    primary_faction_slug: "na",
    metatask_faction_slug: slug,
    created_at: "2026-01-01T00:00:00Z",
    in_progress_count: 0,
    created_by_display_name: "",
    created_by_avatar_url: "",
    created_by_faction_slug: null,
    created_by_level: 0,
    signup_reason: null,
    in_progress_praxis_id: null,
    can_sign_up: true,
    allowed_modes: ["solo"],
    eligible_for_current_user: true,
    start_here: false,
  } as TaskOut;
}

function pickerState(rows: TaskOut[]): EditPraxisState {
  return {
    metatasks: rows,
    appliedMetatasks: new Set<number>(),
    appliedMetataskList: [],
    applyingMetatask: null,
    metataskPickerOpen: true,
    metataskRemovalTarget: null,
    addMetatask: async () => {},
    closeMetataskPicker: () => {},
  } as unknown as EditPraxisState;
}

/** Every seal mounts a band, and a band is a `<Link>` (#2648). */
const render = (node: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

/**
 * The row's hit target — the transparent overlay a `zIndex: 3` identifies
 * (#2648). It is the element the ring rides, so its corner is the one that has
 * to match the card's.
 */
function rowControlStyle(html: string): string {
  const styles = [...html.matchAll(/<button[^>]*style="([^"]*)"/g)].map(
    (match) => match[1],
  );
  const control = styles.filter((style) => style.includes("z-index:3"));
  expect(control).toHaveLength(1);
  return control[0];
}

/**
 * Albescent and na have no `-card-radius` of their own ON PURPOSE: `CSS_KEY`
 * maps both to `default`, so they read the na corner through `factionCssVar`.
 * That is the issue's own table, not a gap.
 */
const CORNERS: [slug: string, token: string][] = [
  ["snide", "--faction-snide-card-radius"],
  ["everymen", "--faction-everymen-card-radius"],
  ["ua", "--faction-ua-card-radius"],
  ["singularity", "--faction-singularity-card-radius"],
  ["ephemerists", "--faction-ephemerists-card-radius"],
  ["wow", "--faction-wow-card-radius"],
  ["coven", "--faction-coven-card-radius"],
  ["albescent", "--faction-default-card-radius"],
  ["na", "--faction-default-card-radius"],
];

describe("a seal's corner is the token's", () => {
  for (const [slug, token] of CORNERS) {
    it(`${slug} draws its outer corner from ${token}`, () => {
      const html = render(<MetataskSeal metatasks={[metatask(slug)]} />);
      expect(html).toContain(`border-radius:var(${token})`);
    });
  }
});

describe("the picker's selection ring takes the same corner", () => {
  for (const [slug, token] of CORNERS) {
    it(`${slug}'s row control rings on ${token}`, () => {
      const html = render(
        <MetataskPicker state={pickerState([metatask(slug)])} />,
      );
      expect(rowControlStyle(html)).toContain(`border-radius:var(${token})`);
    });
  }
});

describe("the empty add slot keeps the na corner", () => {
  it("reads --faction-default-card-radius, like the Default seal above it", () => {
    const html = render(<MetataskSeal metatasks={[]} onAdd={() => {}} />);
    expect(html).toContain("border-radius:var(--faction-default-card-radius)");
  });
});
