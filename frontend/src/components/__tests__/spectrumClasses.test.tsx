/**
 * `.spectrum-frame`'s two siblings (#2497, epic #2496).
 *
 * THE SEAM IS THE CLASS ON THE MOUNT. The na spectrum was an inline
 * `background: var(--faction-default-rainbow)` at every band, hairline, divider
 * and ring across the ten `Default*` files Albescent wears — the same value said
 * privately twenty-one times. An inline style is the one place a stylesheet
 * cannot reach, which is why the design canvas proposed a DOM WALK to animate
 * these: with no selector, there was nothing else to reach for. `.spectrum-rule`
 * and `.spectrum-dial` are that selector.
 *
 * Two things therefore have to hold, and neither is checked by anything else:
 *
 *  1. The CLASSES carry the same ramps the inline styles did. If `.spectrum-rule`
 *     ever drifts off `--faction-default-rainbow`, twenty-one surfaces repaint at
 *     once — the blast radius is exactly why the paint is worth centralising and
 *     exactly why it needs a guard.
 *  2. The MOUNTS wear the class INSTEAD of the declaration. Re-inlining the ramp
 *     renders identically and silently un-dresses the surface again, so "it still
 *     looks right" cannot catch it.
 *
 * The praxis-detail rung dots are the one deliberate hold-out: their ramp is
 * CONDITIONAL on the vote value (`rung <= voter.value ? SPECTRUM : 'none'`), and
 * a class cannot be conditional. #2500 is where that one is settled.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

const CSS = stripComments(
  readFileSync(fileURLToPath(new URL("../../index.css", import.meta.url)), "utf8"),
);

/** The two inline declarations the classes replaced, in rendered-markup form. */
const RETIRED = [
  "background:var(--faction-default-rainbow)",
  "background:var(--faction-default-rainbow-conic)",
  "background-image:var(--faction-default-rainbow)",
];

/**
 * The BASE rule for a class — the one whose prelude is EXACTLY the selector.
 *
 * `ruleBodies` matches by substring, so a dresser scope like `.alb-stamp
 * .spectrum-rule` (#2501) or `.alb-desk .spectrum-rule` (#2505) counts as a
 * `.spectrum-rule` rule to it. That is right for the cascade questions it
 * usually answers and wrong for this one: a dresser scope is the DESIGNED use
 * of these names — #2497's own docblock says so ("a dresser reaches them with
 * `.alb-x .spectrum-rule`", two classes, so it wins on specificity from
 * wherever it is written) — and it must not read as a second declaration.
 *
 * What still has to hold, and what this keeps holding, is that the shared class
 * itself is declared exactly once and carries exactly its ramp. An
 * ancestor-scoped rule repaints nothing else.
 *
 * #2501 and #2505 arrived at this same narrowing independently, one as
 * `ownRule` and one as `baseRuleBodies`. One survives, and it is the one
 * without a hand-escaped regex: an exact prelude comparison cannot drift.
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
      // ONE declaration on purpose. Height, opacity, radius and position are
      // per-mount geometry and stay at the call site; folding any of them in
      // here would repaint every other mount.
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
    "the seal's accent strip": () =>
      renderToStaticMarkup(
        <DefaultSeal
          metatask={{
            id: 1,
            title: "A small kindness",
            condition: "Do it twice",
            bonus_points: 3,
            metatask_faction_slug: "na",
          } as never}
        />,
      ),
  };

  for (const [name, render] of Object.entries(surfaces)) {
    it(`${name} is classed`, () => {
      const markup = render().replace(/\s*([:;,])\s*/g, "$1");
      // All three draw at least one LINEAR cut, so the rule class is the one
      // every surface here must show. The conic sibling is held from the other
      // side by `pointsMarkUnification.test.tsx`, which probes for it by name.
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
