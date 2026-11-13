/**
 * The seal's corner and the picker's selection ring end at ONE token (#2729).
 * Both halves are followed to a `--faction-<slug>-card-radius` name and compared,
 * so a literal on either side fails. Skins reach it via the role map, the picker
 * names it directly; the resolver bridges the two.
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

function pickerState(rows: TaskOut[]): EditPraxisState {
  return anEditPraxisState({ metatasks: rows, metataskPickerOpen: true });
}

/** Every seal mounts a band, and a band is a `<Link>` (#2648). */
const render = (node: React.ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

/**
 * Follow a `border-radius` to its faction token, at most one hop through a role
 * property declared on the same element. `null` means a literal: the defect.
 */
function cornerToken(style: string): string | null {
  const declaration = style.split("border-radius:")[1]?.split(";")[0];
  const read = declaration?.match(/^var\((--[\w-]+)/);
  if (!read) return null;
  if (read[1].startsWith("--faction-")) return read[1];
  // Role read: the declaration answers; the fallback branch covers `Sidebar.tsx`.
  const declared = style.match(
    new RegExp(`${read[1]}:\\s*var\\((--faction-[\\w-]+)\\)`),
  );
  return declared?.[1] ?? declaration?.match(/(--faction-[\w-]+)/)?.[1] ?? null;
}

function skinCorner(element: React.ReactElement): string | null {
  const root = render(element).match(/<div[^>]*style="([^"]*)"/);
  expect(root).not.toBeNull();
  return cornerToken(root![1]);
}

/** The row's hit target (`zIndex: 3`, #2648), which the ring rides. */
function rowControlCorner(slug: string): string | null {
  const html = render(<MetataskPicker {...pickerState([metatask(slug)])} />);
  const controls = [...html.matchAll(/<button[^>]*style="([^"]*)"/g)]
    .map((match) => match[1])
    .filter((style) => style.includes("z-index:3"));
  expect(controls).toHaveLength(1);
  return cornerToken(controls[0]);
}

/** Albescent and na map to `default` via `CSS_KEY` on purpose. */
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
 * Selection must not rest on colour alone (#2729): Snide's and Singularity's
 * accent rings read under 3:1 on this sheet, so a tick rides the control, with
 * identical unstyled markup for all nine factions.
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
