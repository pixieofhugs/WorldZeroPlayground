/**
 * EVERY JOIN PANEL OPENS AT 16px ABOVE ITS HEADLINE (#2621).
 *
 * #2299 cut the italic kicker that used to sit above the join headline, which
 * left each panel's opening decided by whatever padding was under it. Measured,
 * the seven kits were three groups rather than one: Coven and Warriors of Whimsy
 * at `--space-lg`, UA / Ephemerists / Everymen / Singularity / S.N.I.D.E. at
 * `--space-xl`. The owner's ruling (2026-08-27) is one rhythm at Coven's number.
 *
 * ### The seam
 *
 * The inline `padding` shorthand of the box that OPENS the join panel, read off
 * `renderToStaticMarkup`. This harness has no layout engine, and it does not
 * need one: the ruling is about which box declares the opening, and a
 * declaration survives without a layout pass (same call as
 * `praxisCard/__tests__/stampOuterMargin.test.tsx`).
 *
 * ### Why the headline is the anchor and the heading is not
 *
 * The kits do not agree on where their section HEADING lives — Coven,
 * Ephemerists, Everymen, Singularity and WoW hang it in a full-bleed band above
 * the padded body, while UA and S.N.I.D.E. draw it *inside* the padded panel
 * (UA's ruled label, S.N.I.D.E.'s letterhead rule). So "the padding after the
 * heading" is the opening for five of seven and the wrong box for two. The
 * *headline* — the join/gate title the ruling names — is in the same place in
 * all seven, so "the last box declaring a `padding` shorthand before the
 * headline" is one rule that lands on the right element every time. It is also
 * literally the ruling's own phrasing.
 *
 * `padding-bottom` and friends are deliberately NOT counted: S.N.I.D.E.'s
 * letterhead rule states one, and it is a rule under a line rather than the
 * panel's opening.
 *
 * ### Not asserted
 *
 * The horizontal half. Only the vertical opening was ruled on, and three kits
 * legitimately differ there (UA and S.N.I.D.E. keep `--space-xl` sides, which is
 * what their own sibling panels use). Pinning it here would freeze a dimension
 * nobody measured.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import { describe, it, expect } from "vitest";
// Initialize the i18n catalog so faction copy keys resolve to English text.
import "../../../i18n";
import i18n from "../../../i18n";
import { factionName } from "../../../utils/factions";
import type { FactionDetailState, MembershipState } from "../useFactionDetail";
import CovenFactionBody from "../archetypes/CovenFactionBody";
import EphemeristsFactionBody from "../archetypes/EphemeristsFactionBody";
import EverymenFactionBody from "../archetypes/EverymenFactionBody";
import SingularityFactionBody from "../archetypes/SingularityFactionBody";
import SnideFactionBody from "../archetypes/SnideFactionBody";
import UaFactionBody from "../archetypes/UaFactionBody";
import WowFactionBody from "../archetypes/WowFactionBody";

type Body = ComponentType<{ state: FactionDetailState }>;

/**
 * The seven bespoke kits. `na` / `albescent` are out of scope: they share
 * `DefaultFactionBody`, whose join block was not part of the measurement.
 */
const BODIES: Array<[string, Body]> = [
  ["coven", CovenFactionBody as Body],
  ["ephemerists", EphemeristsFactionBody as Body],
  ["everymen", EverymenFactionBody as Body],
  ["singularity", SingularityFactionBody as Body],
  ["snide", SnideFactionBody as Body],
  ["ua", UaFactionBody as Body],
  ["wow", WowFactionBody as Body],
];

/** Coven's number, and the one every kit now opens at. */
const OPENING = "var(--space-lg)";

function stateFor(slug: string, state: MembershipState): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug },
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: null,
    gameFactions: [],
    sections: undefined,
    membership: {
      state,
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState;
}

function markup(slug: string, Body: Body, state: MembershipState): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Body state={stateFor(slug, state)} />
    </MemoryRouter>,
  );
}

/**
 * The headline each kit draws in a given state. Spelled through `i18n.t` so a
 * renamed key fails here as a missing headline rather than passing against a
 * raw key string. Singularity interpolates the faction's own name.
 */
function headline(slug: string, state: MembershipState): string {
  const key =
    state === "eligible"
      ? `factions:${slug}.join.eligibleTitle`
      : `factions:${slug}.join.gateTitle`;
  const text = i18n.t(key as never, { faction: factionName(slug) }) as unknown as string;
  expect(text, `${key} resolves to real copy`).not.toBe(key);
  return text;
}

/**
 * Every `<div>` whose inline style declares the `padding` SHORTHAND, in document
 * order. The shorthand only — a lone `padding-bottom` is a rule under a line,
 * not a panel's opening.
 */
function paddedBoxes(html: string): Array<{ at: number; end: number; padding: string }> {
  const boxes: Array<{ at: number; end: number; padding: string }> = [];
  const tag = /<div [^>]*style="([^"]*)"[^>]*>/g;
  let hit: RegExpExecArray | null;
  while ((hit = tag.exec(html)) !== null) {
    const decl = hit[1].split(";").find((d) => d.startsWith("padding:"));
    if (decl) {
      boxes.push({
        at: hit.index,
        end: hit.index + hit[0].length,
        padding: decl.slice("padding:".length),
      });
    }
  }
  return boxes;
}

/**
 * The vertical half of the shorthand opening the panel that holds `title`.
 *
 * The headline's OWN box is skipped, which matters for exactly one kit:
 * S.N.I.D.E. sets its headline as an inline-block acid plate with a
 * `var(--space-xs) var(--space-sm)` inset of its own. That inset is the stencil,
 * not the panel's opening, and a naive "last padding before the headline" probe
 * reads it and reports S.N.I.D.E. at 4px — which is how the 2026-08-27
 * measurement recorded it. Under the plate, its panel opens at the same
 * `--space-xl` the other four did.
 */
function openingAbove(html: string, title: string): string {
  const at = html.indexOf(title);
  expect(at, `the headline "${title}" is drawn`).toBeGreaterThan(-1);
  const box = paddedBoxes(html)
    // Nothing but text between the tag and the title means this box IS the
    // headline rather than something above it.
    .filter((b) => b.at < at && html.slice(b.end, at).includes("<"))
    .pop();
  expect(box, `a padded box opens the panel above "${title}"`).toBeTruthy();
  // One value means all four sides; two or more means vertical first.
  return box!.padding.trim().split(/\s+/)[0];
}

describe("every join panel opens at Coven's 16px above its headline (#2621)", () => {
  // Both states, because #2299 cut the kicker from both and the eligible half
  // is the only one that had been drawn when the ruling was written.
  for (const state of ["eligible", "gate"] as MembershipState[]) {
    for (const [slug, Body] of BODIES) {
      it(`${slug}, ${state}`, () => {
        const html = markup(slug, Body, state);
        expect(openingAbove(html, headline(slug, state))).toBe(OPENING);
      });
    }
  }
});
