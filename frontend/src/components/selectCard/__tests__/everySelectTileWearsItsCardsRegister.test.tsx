/**
 * Two faction-invariant select-tile checks, derived over every registered kit
 * from `surfaceMap('factionSelectCard')` (#2816, #2815): the fluid 360x300 box
 * (#732) and "names no token family its own task card does not" (#2321), both
 * read off the RENDER. The bespoke `*WearsThe*Register` files keep the rest.
 *
 * Albescent's tile is `DefaultSelectCard` in a geometry-only wrapper (#2632):
 * covered via `na`, with its own box case after the loop.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import "../../../i18n";

const mocks = vi.hoisted(() => ({ formFactor: "desktop" as "mobile" | "desktop" }));
vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => mocks.formFactor }));

import { surfaceMap } from "../../../factions";
import { aTask } from "../../../test/fixtures";
import { ALBESCENT_FACTION_SLUG } from "../../../utils/factions";
import * as ephemeristsPlate from "../../factionMarks/ephemeristsPlate";

/** Minus Albescent (see the file header). */
const SLUGS = Object.keys(surfaceMap("factionSelectCard")).filter(
  (slug) => slug !== ALBESCENT_FACTION_SLUG,
);

const STATES = ["locked", "eligible", "member"] as const;

/** A dispatched tile, rendered the way the directory mounts it: with a standing. */
function renderTile(slug: string, state: (typeof STATES)[number]): string {
  const Tile = surfaceMap("factionSelectCard")[slug];
  return renderToStaticMarkup(
    <MemoryRouter>
      <Tile state={state} onVisit={() => {}} />
    </MemoryRouter>,
  );
}

function frameTag(html: string, missing: string): string {
  const at = html.indexOf("data-select-frame");
  expect(at, missing).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

describe("every select tile keeps the fluid 360x300 box the directory grid is built on (#732)", () => {
  it("covers every kit but Albescent's wrapper (see file header)", () => {
    expect([...SLUGS].sort()).toEqual(
      ["coven", "ephemerists", "everymen", "na", "singularity", "snide", "ua", "wow"].sort(),
    );
  });

  it.each(SLUGS)("%s", (slug) => {
    for (const state of STATES) {
      const frame = frameTag(renderTile(slug, state), `${slug} (${state}) renders no select frame`);
      expect(frame).toMatch(/[";]width:100%/);
      expect(frame).toContain("max-width:360px");
      expect(frame).toContain("min-height:300px");
      expect(frame, "a fixed height would break the phone column").toContain("height:auto");
    }
  });

  /** The wrapper is the flex item (#2579) and hands height on (#3139); nothing else checks it. */
  it.each(STATES)("albescent's wrapper keeps the tile's box and hands the height on (%s)", (state) => {
    const html = renderTile(ALBESCENT_FACTION_SLUG, state);
    const wrapper = html.slice(0, html.indexOf(">") + 1);
    expect(wrapper).toMatch(/^<div class="alb-moves/);
    expect(wrapper).toMatch(/[";]width:100%/);
    expect(wrapper).toContain("max-width:360px");
    expect(wrapper).toContain("display:flex");
    expect(wrapper).toContain("flex-direction:column");
    expect(wrapper).toContain("flex-grow:1");
    expect(html.slice(wrapper.length)).toMatch(/^<div[^>]*data-select-frame/);
  });
});

/* Invariant 2 — names no token family its own task card does not (#2321) */

const TASK = aTask({ description: "Leave something small and honest.", in_progress_count: 2 });

/** The custom properties a rendered surface names. */
const propsIn = (html: string): Set<string> =>
  new Set([...html.matchAll(/(--[a-z0-9-]+)/g)].map((match) => match[1]));

/** House tokens (spacing, type ramp, radii) are everyone's. */
const isFactionPaint = (prop: string): boolean =>
  /^--(faction-|font-faction-|everymen-|snide-)/.test(prop);

/** The card's register: its task card on both form factors. */
function cardRegister(slug: string): Set<string> {
  const Card = surfaceMap("taskCard")[slug];
  const register = new Set<string>();
  for (const formFactor of ["desktop", "mobile"] as const) {
    mocks.formFactor = formFactor;
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Card task={TASK} basePoints={TASK.point_value} multiplier={1} inProgressCount={2} onSignup={() => {}} />
      </MemoryRouter>,
    );
    for (const prop of propsIn(html)) register.add(prop);
  }
  mocks.formFactor = "desktop";
  return register;
}

/** Waived by name: a mark's interior is its own business (#2325); the UA synonym is proven equal in `uaWearsTheLeafRegister`. */
const WAIVED: Record<string, readonly string[]> = {
  ua: ["--faction-ua-parchment"],
  na: ["--faction-default-rainbow-conic"],
};

describe("every select tile names no token family its own task card does not (#2321)", () => {
  it.each(SLUGS)("%s", (slug) => {
    const register = cardRegister(slug);
    // The plate palette IS the Ephemerists register: the card paints it through CSS classes.
    if (slug === "ephemerists") {
      for (const value of Object.values(ephemeristsPlate)) {
        if (typeof value === "string") for (const prop of propsIn(value)) register.add(prop);
      }
    }
    const tile = new Set<string>();
    for (const state of STATES) for (const prop of propsIn(renderTile(slug, state))) tile.add(prop);

    const strays = [...tile].filter(isFactionPaint).filter((prop) => !register.has(prop) && !(WAIVED[slug] ?? []).includes(prop));
    expect(
      strays,
      `Each name is a token the ${slug} DIRECTORY TILE paints with and the TASK CARD never names — the shape #2321 calls a forked family. Find the role on the card that answers the same question, or say in the PR that the task card has no answer — not by widening this test.`,
    ).toEqual([]);
  });
});
