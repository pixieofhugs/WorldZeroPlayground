/**
 * #2312 — the byline's rule is a slot. Owner ruling: Ephemerists shows its runes
 * (`EphemeristsNotationBand`) instead of the dashed line; the other cards must
 * be unchanged. Rendered through the real cards, not `PraxisByline` alone: the
 * sharp check is that all dashed cards emit an IDENTICAL byline row once ink is
 * discounted, which fails if the rule forks per faction. SSR-only.
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
// `useTheme()` throws outside a `ThemeProvider` (#701); the score stamp uses it.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

// Imported after the mocks are registered.
import { surfaceMap } from "../../../factions";

import { drawNotation } from "../../factionMarks/EphemeristsNotationBand";

/** The card's own source — read for the one claim markup cannot carry. */
const CARD = fileURLToPath(new URL("../desktop/EphemeristsPraxisCard.tsx", import.meta.url));
import { aPraxisCard } from "../../../test/fixtures";

/** The rule as it is declared in `PraxisByline`, spelled out on purpose. */
const DASHED_RULE =
  "border-top:1px dashed color-mix(in srgb, currentColor 30%, transparent)";

/** The one kit ruling its byline with runes (#2815); every other registered card must not. */
const RUNED_SLUG = "ephemerists";

const PRAXIS_CARDS = surfaceMap("praxisCard");

/** Every card that keeps the dashed rule. Ephemerists is the exception, below. */
const DASHED: [string, ComponentType<ArchetypeProps>][] = Object.entries(PRAXIS_CARDS).filter(
  ([slug]) => slug !== RUNED_SLUG,
);

/** Rendering `undefined` throws, so a de-registered row fails loudly below. */
const EphemeristsPraxisCard = PRAXIS_CARDS[RUNED_SLUG];

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
  it("emits the same byline row on every one, apart from the sheet's own ink", () => {
    // Ink (`muted`) is per-faction by design; strip it and compare the slot.
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
    // The retired 32-mark inline `DRIFT` (#2210 / #2067).
    expect(html(), "the retired inline drift").not.toContain("epg-glyph");
  });

  it("draws a different row per praxis, and seeds the byline apart from the composer", () => {
    // Asserted at the draw: no DOM here, so a rendered divider is empty (#2230).
    // Varies per praxis, stable per praxis, and distinct from the composer's `top`.
    const row = (seed: string) => JSON.stringify(drawNotation(seed));
    expect(row("praxis:41:divider")).not.toBe(row("praxis:42:divider"));
    expect(row("praxis:41:divider")).toBe(row("praxis:41:divider"));
    expect(row("praxis:41:divider")).not.toBe(row("praxis:41:top"));
  });

  it("hands the strip the praxis's own id as its seed", () => {
    // Pins that the CARD passes `praxis:${id}`, not one hard-coded seed.
    expect(readFileSync(CARD, "utf8")).toContain('seed={`praxis:${praxis.id}`}');
  });
});

describe("the divider is the width of the media box above it (#2724)", () => {
  const html = () => card("ephemerists", EphemeristsPraxisCard);

  it("hangs the strip in the leaf's own column, with nothing bleeding it out", () => {
    // #2724: the row is the width of the media box above it; `width: 100%`
    // inside the padded leaf already is that column, so no bleed wrapper.
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
    // Comments stripped: the docblock names the retired constant.
    const code = readFileSync(CARD, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
    expect(code).not.toContain("LEAF_BLEED");
    expect(code).not.toContain("* -1)");
  });
});
