/**
 * Every join panel opens at 16px (`--space-lg`) above its headline (#2621).
 * Probe: the last box declaring a `padding` shorthand before the headline (the
 * section heading sits inside the panel for UA/S.N.I.D.E., outside for the rest,
 * so it can't anchor). Only the vertical half was ruled on; sides may differ.
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

/** `na`/`albescent` (`DefaultFactionBody`) were not part of the ruling. */
const BODIES: Array<[string, Body]> = [
  ["coven", CovenFactionBody as Body],
  ["ephemerists", EphemeristsFactionBody as Body],
  ["everymen", EverymenFactionBody as Body],
  ["singularity", SingularityFactionBody as Body],
  ["snide", SnideFactionBody as Body],
  ["ua", UaFactionBody as Body],
  ["wow", WowFactionBody as Body],
];

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

/** Resolved through `i18n.t` so a renamed key fails rather than matching itself. */
function headline(slug: string, state: MembershipState): string {
  const key =
    state === "eligible"
      ? `factions:${slug}.join.eligibleTitle`
      : `factions:${slug}.join.gateTitle`;
  const text = i18n.t(key as never, { faction: factionName(slug) }) as unknown as string;
  expect(text, `${key} resolves to real copy`).not.toBe(key);
  return text;
}

/** `<div>`s declaring the `padding` shorthand (not `padding-bottom`), in order. */
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
 * Vertical padding of the box opening the panel above `title`. The headline's own
 * box is skipped: S.N.I.D.E.'s headline plate has its own inset.
 */
function openingAbove(html: string, title: string): string {
  const at = html.indexOf(title);
  expect(at, `the headline "${title}" is drawn`).toBeGreaterThan(-1);
  const box = paddedBoxes(html)
    // Only text between tag and title = this box IS the headline.
    .filter((b) => b.at < at && html.slice(b.end, at).includes("<"))
    .pop();
  expect(box, `a padded box opens the panel above "${title}"`).toBeTruthy();
  // One value means all four sides; two or more means vertical first.
  return box!.padding.trim().split(/\s+/)[0];
}

describe("every join panel opens at Coven's 16px above its headline (#2621)", () => {
  for (const state of ["eligible", "gate"] as MembershipState[]) {
    for (const [slug, Body] of BODIES) {
      it(`${slug}, ${state}`, () => {
        const html = markup(slug, Body, state);
        expect(openingAbove(html, headline(slug, state))).toBe(OPENING);
      });
    }
  }
});
