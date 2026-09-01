/**
 * The seal's corner and the picker's selection ring end at ONE token (#2729).
 *
 * The seam is the pair, not either half: the ring is drawn on the picker row's
 * control and the corner on the skin inside it, and the defect was that the two
 * were separate literals — a hardcoded `borderRadius: 12` on the row against a
 * `borderRadius: 4` Singularity seal, so a 14px arc drawn 2px outside a 4px
 * corner passed *inside* the card and vanished behind it.
 *
 * So both halves are FOLLOWED to a `--faction-<slug>-card-radius` name and
 * compared against each other. A literal on either side fails here, and no
 * literal can agree with the other side by accident again.
 *
 * The two halves spell it differently on purpose, and the resolver is why the
 * test can say so: a skin that declares a role map must read `radius` off the
 * map rather than name a core suffix (`factionRoleFallbacks.test.ts`, #2659),
 * and the map points at exactly the token the picker names.
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
import MetataskPicker, { PickerRow } from "../MetataskPicker";
import AlbescentSeal from "../skins/AlbescentSeal";
import CovenSeal from "../skins/CovenSeal";
import DefaultSeal from "../skins/DefaultSeal";
import EphemeristsSeal from "../skins/EphemeristsSeal";
import EverymenSeal from "../skins/EverymenSeal";
import SingularitySeal from "../skins/SingularitySeal";
import SnideSeal from "../skins/SnideSeal";
import UaSeal from "../skins/UaSeal";
import WowSeal from "../skins/WowSeal";
import type { SealSkinProps } from "../types";
import type { EditPraxisState } from "../../../pages/editPraxis/useEditPraxis";
import { anEditPraxisState } from "../../../test/fixtures";
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

// The open picker and its rows are the premise; everything else is the
// fixture's quiet default (#2877).
function pickerState(rows: TaskOut[]): EditPraxisState {
  return anEditPraxisState({ metatasks: rows, metataskPickerOpen: true });
}

/** Every seal mounts a band, and a band is a `<Link>` (#2648). */
const render = (node: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

/**
 * Follow a `border-radius` from the element that draws it to the faction token
 * behind it — one hop at most, through the role map's own property when the
 * skin declares one (`--sg-seal-radius: var(--faction-singularity-card-radius)`,
 * emitted onto the very element that reads it). `null` means the corner is a
 * literal, which is the defect.
 */
function cornerToken(style: string): string | null {
  const declaration = style.split("border-radius:")[1]?.split(";")[0];
  const read = declaration?.match(/^var\((--[\w-]+)/);
  if (!read) return null;
  if (read[1].startsWith("--faction-")) return read[1];
  // A role read. Since #2690 the map declares the property for every slug —
  // na and Albescent included, on the neutral family — so the declaration on
  // this element is normally what answers. The fallback branch stays for the one
  // surface that withholds the map from itself (`Sidebar.tsx`), where clause 3
  // of the standing rule pins the fallback to the same token anyway.
  const declared = style.match(
    new RegExp(`${read[1]}:\\s*var\\((--faction-[\\w-]+)\\)`),
  );
  return declared?.[1] ?? declaration?.match(/(--faction-[\w-]+)/)?.[1] ?? null;
}

/** A skin's own root — the box the corner belongs to. */
function skinCorner(element: React.ReactElement): string | null {
  const root = render(element).match(/<div[^>]*style="([^"]*)"/);
  expect(root).not.toBeNull();
  return cornerToken(root![1]);
}

/**
 * The row's hit target — the transparent overlay a `zIndex: 3` identifies
 * (#2648). It is the element the ring rides, so its corner is the one that has
 * to match the card's.
 */
function rowControlCorner(slug: string): string | null {
  const html = render(<MetataskPicker {...pickerState([metatask(slug)])} />);
  const controls = [...html.matchAll(/<button[^>]*style="([^"]*)"/g)]
    .map((match) => match[1])
    .filter((style) => style.includes("z-index:3"));
  expect(controls).toHaveLength(1);
  return cornerToken(controls[0]);
}

/**
 * Albescent and na have no `-card-radius` of their own ON PURPOSE: `CSS_KEY`
 * maps both to `default`, so they read the na corner. That is the issue's own
 * table, not a gap.
 */
const CORNERS: [
  slug: string,
  token: string,
  Skin: (props: SealSkinProps) => React.ReactElement,
][] = [
  ["snide", "--faction-snide-card-radius", SnideSeal],
  ["everymen", "--faction-everymen-card-radius", EverymenSeal],
  ["ua", "--faction-ua-card-radius", UaSeal],
  ["singularity", "--faction-singularity-card-radius", SingularitySeal],
  ["ephemerists", "--faction-ephemerists-card-radius", EphemeristsSeal],
  ["wow", "--faction-wow-card-radius", WowSeal],
  ["coven", "--faction-coven-card-radius", CovenSeal],
  ["albescent", "--faction-default-card-radius", AlbescentSeal],
  ["na", "--faction-default-card-radius", DefaultSeal],
];

describe("a seal's corner is the token's", () => {
  for (const [slug, token, Skin] of CORNERS) {
    it(`${slug} draws its outer corner from ${token}`, () => {
      expect(skinCorner(<Skin metatask={metatask(slug)} />)).toBe(token);
    });
  }
});

describe("the picker's ring cannot disagree with the card it rings", () => {
  for (const [slug, token, Skin] of CORNERS) {
    it(`${slug}'s row control rings on ${token}`, () => {
      const control = rowControlCorner(slug);
      expect(control).toBe(token);
      expect(control).toBe(skinCorner(<Skin metatask={metatask(slug)} />));
    });
  }
});

describe("the empty add slot keeps the na corner", () => {
  it("reads --faction-default-card-radius, like the Default seal above it", () => {
    const html = render(<MetataskSeal metatasks={[]} onAdd={() => {}} />);
    const slot = html.match(/<button[^>]*style="([^"]*)"/);
    expect(cornerToken(slot![1])).toBe("--faction-default-card-radius");
  });
});

/**
 * AND SELECTION SURVIVES A RING NOBODY CAN SEE (#2729 follow-up).
 *
 * The seam here is the OTHER half of "which row is chosen": not *does the ring
 * match the card* but *is the ring the only thing saying so*. Measured against
 * the picker's own stock in light, the accent ring reads 1.19:1 on Snide's
 * toxic acid and 1.72:1 on the Singularity's phosphor — under 1.4.11's 3:1 for
 * a non-text state indicator — and this is the sole indicator on the row. So a
 * mark that is present or absent rides beside it, and these cases exist so that
 * a later edit cannot quietly put selection back on colour alone.
 *
 * Three properties, all nine factions:
 *   1. a selected row draws the tick, an unselected one draws none;
 *   2. the tick rides the CONTROL, the element the ring rides, for the same
 *      reason — four seals paint past their own border box;
 *   3. the tick's markup is byte-identical across the nine, and carries no
 *      inline style, so it cannot acquire a per-faction hue without failing.
 */
const TICK = '<span class="metatask-pick__tick" aria-hidden="true">\u2713</span>';

const selectedRow = (slug: string, selected: boolean) =>
  render(
    <PickerRow
      metatask={metatask(slug)}
      sealed={false}
      selected={selected}
      onPick={() => {}}
    />,
  );

describe("selection is not carried by the accent's contrast alone", () => {
  for (const [slug] of CORNERS) {
    it(`${slug}'s selected row draws the tick, and only when selected`, () => {
      expect(selectedRow(slug, true)).toContain(TICK);
      expect(selectedRow(slug, false)).not.toContain("metatask-pick__tick");
    });

    it(`${slug}'s tick rides the control the ring rides`, () => {
      // Straight after the control's own opening tag — inside the `inset: 0`,
      // `zIndex: 3` overlay, where nothing in the row can paint over it.
      expect(selectedRow(slug, true)).toMatch(
        new RegExp(`<button[^>]*z-index:3[^>]*>${TICK.replace(/[[\]/\^$*+?.()|{}]/g, "\$&")}`),
      );
    });

    it(`${slug}'s ring is still its own accent, beside the tick`, () => {
      const accent = `--faction-${slug === "albescent" || slug === "na" ? "default" : slug}-card-accent`;
      expect(selectedRow(slug, true)).toContain(
        `outline:2px solid var(${accent})`,
      );
    });
  }

  it("draws ONE tell for nine factions — same markup, no inline paint", () => {
    const ticks = CORNERS.map(
      ([slug]) => selectedRow(slug, true).match(/<span class="metatask-pick__tick"[^>]*>[^<]*<\/span>/)![0],
    );
    expect(new Set(ticks).size).toBe(1);
    expect(ticks[0]).not.toContain("style=");
  });
});
