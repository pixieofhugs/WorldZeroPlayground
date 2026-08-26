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
import MetataskPicker from "../MetataskPicker";
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
  // A role read. Either the map declared it here, or — for na, albescent and
  // any unknown slug, where `factionRoleVars` emits nothing — the fallback is
  // what renders, and clause 3 of the standing rule pins it to the same token.
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
  const html = render(<MetataskPicker state={pickerState([metatask(slug)])} />);
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
