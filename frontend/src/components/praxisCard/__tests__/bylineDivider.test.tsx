/**
 * #2312 — THE BYLINE'S RULE IS A SLOT, AND EIGHT CARDS MUST NOT NOTICE.
 *
 * Owner ruling, on a screenshot of the Ephemerists praxis card: *"the runes
 * should show up instead of the dotted line under 'no proof attached'"*. So
 * `PraxisByline`'s `border-top: 1px dashed …` became an optional `divider`
 * node, and the Ephemerists plate passes its notation band (`EphemeristsNotationBand`,
 * which absorbed the rune strip in #2230).
 *
 * THE SEAM IS THE NINE CARDS' RENDERED BYLINE, not `PraxisByline` in isolation,
 * and the distinction is the whole reason this file exists. A shared slot taking
 * a new optional prop is only safe if the callers that pass nothing are
 * unchanged, and the callers are eight bespoke frames composing it through
 * `PraxisBody`. Rendering the component alone would prove the default branch
 * works and prove nothing about the composition that actually ships.
 *
 * Two properties, and the second is the sharp one:
 *
 *  1. Eight cards still carry the dashed rule, at the exact declaration they
 *     carried before, and none of them emits a rune.
 *  2. All eight emit the IDENTICAL byline element as each other once the
 *     faction's own ink is discounted — which is what one shared slot makes
 *     true and eight copies could only promise. That is the assertion that
 *     fails if a future edit forks the rule per faction.
 *
 * SSR-only harness (`renderToStaticMarkup`, no DOM, effects never run), so
 * these pin markup given props. Nothing here is measured — that the strip
 * reaches both card edges is a cascade fact and is eyeballed.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type { ComponentType } from "react";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import type { ArchetypeProps } from "../desktop/shared";

vi.mock("../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));
// `useTheme()` throws outside a `ThemeProvider` by design (#701) and the score
// stamp reaches for it. The byline is a token dress; the half is the cascade's.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

// Imported after the mocks are registered.
import AlbescentPraxisCard from "../desktop/AlbescentPraxisCard";
import CovenPraxisCard from "../desktop/CovenPraxisCard";
import DefaultPraxisCard from "../desktop/DefaultPraxisCard";
import EphemeristsPraxisCard from "../desktop/EphemeristsPraxisCard";
import EverymenPraxisCard from "../desktop/EverymenPraxisCard";
import SingularityPraxisCard from "../desktop/SingularityPraxisCard";
import SnidePraxisCard from "../desktop/SnidePraxisCard";
import UaPraxisCard from "../desktop/UaPraxisCard";
import WowPraxisCard from "../desktop/WowPraxisCard";

import { drawNotation } from "../../factionMarks/EphemeristsNotationBand";

/** The card's own source — read for the one claim markup cannot carry. */
const CARD = fileURLToPath(new URL("../desktop/EphemeristsPraxisCard.tsx", import.meta.url));
import { aPraxisCard } from "../../../test/fixtures";

/** The rule as it is declared in `PraxisByline`, spelled out on purpose. */
const DASHED_RULE =
  "border-top:1px dashed color-mix(in srgb, currentColor 30%, transparent)";

/** The eight that keep the dashed rule. Ephemerists is the ninth, below. */
const DASHED: [string, ComponentType<ArchetypeProps>][] = [
  ["albescent", AlbescentPraxisCard],
  ["coven", CovenPraxisCard],
  ["na", DefaultPraxisCard],
  ["everymen", EverymenPraxisCard],
  ["singularity", SingularityPraxisCard],
  ["snide", SnidePraxisCard],
  ["ua", UaPraxisCard],
  ["wow", WowPraxisCard],
];

const adminProps = {
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
} as unknown as ArchetypeProps["adminProps"];

function card(slug: string, Praxis: ComponentType<ArchetypeProps>): string {
  const praxis = aPraxisCard({ task_faction_slug: slug });
  return renderToStaticMarkup(
    <MemoryRouter>
      <Praxis praxis={praxis} adminProps={{ ...adminProps, praxis }} />
    </MemoryRouter>,
  );
}

/**
 * The byline row's own opening tag. It is the element carrying the rule, and
 * `flex justify-between items-center font-body` is the class list `PraxisByline`
 * writes and nothing else on these cards does.
 */
function byline(html: string): string {
  const at = html.indexOf('class="flex justify-between items-center font-body"');
  expect(at, "the shared byline row").toBeGreaterThan(-1);
  return html.slice(at, html.indexOf(">", at) + 1);
}

describe.each(DASHED)("the %s card keeps the dashed byline rule (#2312)", (slug, Praxis) => {
  it("declares the rule exactly as it always did", () => {
    expect(byline(card(slug, Praxis))).toContain(DASHED_RULE);
  });

  it("wears no rune: the strip is one faction's mark, not a new default", () => {
    expect(card(slug, Praxis)).not.toContain("data-eph-runes");
  });
});

describe("one slot, not nine copies (#2312)", () => {
  it("emits the same byline row on all eight, apart from the sheet's own ink", () => {
    // The ink is the frame's `muted` prop and is per-faction by design; strip it
    // and what is left is the slot itself. If a future edit forks the rule for
    // one faction, these stop matching and this fails rather than drifting.
    const rows = DASHED.map(([slug, Praxis]) =>
      byline(card(slug, Praxis)).replace(/color:[^;"]*/g, "color:_"),
    );
    expect(new Set(rows).size, rows.join("\n")).toBe(1);
  });
});

describe("the Ephemerists plate rules its byline with runes (#2312)", () => {
  const html = () => card("ephemerists", EphemeristsPraxisCard);

  it("draws the strip where the dashed rule was, and drops the rule", () => {
    expect(byline(html()), "the generic rule is gone").not.toContain(DASHED_RULE);
    expect(html(), "and the faction's own mark is there").toContain(
      'data-eph-runes="divider"',
    );
  });

  it("puts the strip ABOVE the byline row, where the top border was", () => {
    const rendered = html();
    expect(rendered.indexOf('data-eph-runes="divider"')).toBeLessThan(
      rendered.indexOf('class="flex justify-between items-center font-body"'),
    );
  });

  it("no longer marches its own private copy of the strip", () => {
    // `DRIFT` was thirty-two marks inline in the card, a third drawing of a
    // device that is already a component (#2210 / #2067). `epg-glyph` was its
    // class and `∮` a mark it wrote that the seeded pool can drop.
    expect(html(), "the retired inline drift").not.toContain("epg-glyph");
  });

  it("draws a different row per praxis, and seeds the byline apart from the composer", () => {
    // AT THE DRAW, not at the markup, and that is #2230's doing: the row's
    // count is measured off a real element now, and this harness has no DOM, so
    // a rendered divider is an empty divider here however it was seeded. What
    // the card owes is the SEED it passes, and this is what that seed draws.
    //
    // Different per praxis, so a feed does not march one row down the page;
    // stable per praxis, so a vote landing cannot reshuffle it under the reader.
    // And distinct from `top`, because the composer draws `praxis:${id}` too and
    // only the side keeps the two apart.
    const row = (seed: string) => JSON.stringify(drawNotation(seed));
    expect(row("praxis:41:divider")).not.toBe(row("praxis:42:divider"));
    expect(row("praxis:41:divider")).toBe(row("praxis:41:divider"));
    expect(row("praxis:41:divider")).not.toBe(row("praxis:41:top"));
  });

  it("hands the strip the praxis's own id as its seed", () => {
    // The half the assertion above cannot see: that the CARD is the thing
    // passing `praxis:${id}`. A card that hard-coded one seed would draw one row
    // for the whole feed and every claim above would still hold.
    expect(readFileSync(CARD, "utf8")).toContain('seed={`praxis:${praxis.id}`}');
  });
});

describe("the divider is the width of the media box above it (#2724)", () => {
  const html = () => card("ephemerists", EphemeristsPraxisCard);

  it("hangs the strip in the leaf's own column, with nothing bleeding it out", () => {
    // `LEAF_BLEED` was `0 calc(var(--space-xl) * -1)` on a wrapper around the
    // strip: #2312 read corner-to-corner as the card's BORDER box, so the row
    // overhung the "no proof attached" box above it by 20px a side. #2724
    // retires that rule — a rune row is the width of the thing above it — and
    // the wrapper is deleted rather than re-inset, because `width: 100%` inside
    // the padded leaf already IS the media box's column.
    expect(html(), "a negative inset around the strip").not.toContain(
      "calc(var(--space-xl) * -1)",
    );
  });

  it("carries no inset of its own either", () => {
    const at = html().indexOf('data-eph-runes="divider"');
    const tag = html().slice(html().lastIndexOf("<", at), html().indexOf(">", at));
    expect(tag).toContain("width:100%");
    expect(tag).not.toContain("margin");
  });

  it("keeps no bleed constant in the card's code", () => {
    // Read with the comments stripped, the way this kit's other source guards
    // read: the docblock NAMES the retired constant to say it is retired, and a
    // guard a prose mention can trip is a guard nobody keeps.
    const code = readFileSync(CARD, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
    expect(code).not.toContain("LEAF_BLEED");
    expect(code).not.toContain("* -1)");
  });
});
