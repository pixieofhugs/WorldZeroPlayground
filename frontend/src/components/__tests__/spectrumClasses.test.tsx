/**
 * `.spectrum-rule` / `.spectrum-dial` (#2497): the na spectrum as a class, so a
 * stylesheet can reach it (an inline style cannot). Pins that (1) the classes
 * carry the ramps, and (2) the mounts wear the class instead of inlining it,
 * which renders identically and so would pass unnoticed. Praxis-detail rung
 * dots are conditional on the vote and stay inline (#2500).
 */

import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import "../../i18n";
import { aTask } from "../../test/fixtures";
import type { PraxisCardOut } from "../../api/praxis";
import { stripComments } from "../../utils/__tests__/cssVars";

vi.mock("../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));

// Imported after the mock is registered.
import DefaultTaskCard from "../taskCard/DefaultTaskCard";
import DefaultScoreStamp from "../praxisCard/scoreStamp/DefaultScoreStamp";
import DefaultSeal from "../metataskSeal/skins/DefaultSeal";
import { readIndexCss } from "../../test/indexCss";

const CSS = stripComments(
  readIndexCss(),
);

/** The two inline declarations the classes replaced, in rendered-markup form. */
const RETIRED = [
  "background:var(--faction-default-rainbow)",
  "background:var(--faction-default-rainbow-conic)",
  "background-image:var(--faction-default-rainbow)",
];

/**
 * The BASE rule for a class: prelude exactly the selector. `ruleBodies` matches
 * by substring, so dresser scopes like `.alb-moves .spectrum-rule` (their
 * designed use) would count as second declarations.
 */
function baseRuleBodies(css: string, selector: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, prelude]) => prelude.trim() === selector)
    .map(([, , body]) => body);
}

describe("the two classes carry the paint their mounts had inline (#2497)", () => {
  const cases = [
    [".spectrum-rule", "var(--faction-default-rainbow)"],
    [".spectrum-dial", "var(--faction-default-rainbow-conic)"],
  ] as const;

  for (const [selector, ramp] of cases) {
    it(`${selector} paints ${ramp} and nothing else`, () => {
      const bodies = baseRuleBodies(CSS, selector);
      expect(bodies, `${selector} is not declared in index.css`).toHaveLength(1);
      const declarations = bodies[0]
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean);
      // One declaration: geometry is per-mount and stays at the call site.
      expect(declarations).toEqual([`background-image: ${ramp}`]);
    });
  }

  it("keeps the conic off the linear cut — a 7-stop ramp is mud on a ring", () => {
    expect(baseRuleBodies(CSS, ".spectrum-rule")[0]).not.toContain("conic");
  });
});

describe("the na mounts wear the class, not the declaration (#2497)", () => {
  const surfaces: Record<string, () => string> = {
    "the task card's tick and CTA hairline": () =>
      renderToStaticMarkup(
        <MemoryRouter>
          <DefaultTaskCard
            task={aTask({ description: "Leave something where a stranger finds it." })}
            basePoints={12}
            multiplier={1}
            inProgressCount={2}
            onSignup={() => {}}
          />
        </MemoryRouter>,
      ),
    "the score stamp's bar and ring": () =>
      renderToStaticMarkup(
        <DefaultScoreStamp
          praxis={
            {
              task_point_value: 12,
              display_multiplier: 1.5,
              metatask_points: 0,
              points_from_votes: 4,
              habit_bonus_points: 0,
              is_top_for_task: false,
              score: 22,
            } as PraxisCardOut
          }
        />,
      ),
  };

  for (const [name, render] of Object.entries(surfaces)) {
    it(`${name} is classed`, () => {
      const markup = render().replace(/\s*([:;,])\s*/g, "$1");
      // The conic sibling is held by `pointsMarkUnification.test.tsx`.
      expect(markup).toContain("spectrum-rule");
      for (const declaration of RETIRED) {
        expect(
          markup,
          `${declaration} is inline again — a stylesheet cannot reach it`,
        ).not.toContain(declaration);
      }
    });
  }
});

/**
 * The seal's spectrum is its border (#2520), as on the task and praxis cards:
 * no strip, and the ramp arrives via `factionSpectrumSheet()`.
 */
describe("the seal wears the spectrum as a border, not a bar (#2520)", () => {
  // The seal's `DefaultBand` is a `<Link>`.
  const markup = () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <DefaultSeal
          metatask={{
            id: 1,
            title: "A small kindness",
            condition: "Do it twice",
            bonus_points: 3,
            metatask_faction_slug: "na",
          } as never}
        />
      </MemoryRouter>,
    ).replace(/\s*([:;,])\s*/g, "$1");

  it("draws no accent strip at all", () => {
    expect(markup()).not.toContain("spectrum-rule");
  });

  it("paints the ramp into a transparent 3px frame", () => {
    const html = markup();
    // 3px, matching the task and praxis cards (the board's CSS, not its comment).
    expect(html).toContain("border:3px solid transparent");
    expect(html).toContain(
      "background-image:var(--faction-default-card-sheet),var(--faction-default-rainbow)",
    );
    // Without border-box origin and padding-box clip the border is flat sheet colour.
    expect(html).toContain("background-origin:border-box");
    expect(html).toContain("border-box");
  });
});
