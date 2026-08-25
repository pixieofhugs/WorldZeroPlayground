/**
 * #2403 — every UA and chronicle CARD FRAME reads the radius token instead of
 * restating it.
 *
 * THE SEAM is the frame element's own `style` attribute against
 * `--faction-{key}-card-radius`. #2361 minted that token from `frameBase`'s
 * prose and deliberately left the cards on literals, because moving them was
 * not then a no-op: UA drew 7 and the chronicle drew 9 against a documented 7
 * and 9, and the owner had not yet ruled on the numbers. #2403 rules both to 8,
 * so for these frames reading the token IS a no-op, and the number stops being
 * copied.
 *
 * `utils/__tests__/factionCardFrame.test.ts` holds the OTHER half: token
 * against prose. It cannot see this one, because a frame that hardcodes 8
 * resolves the same list to the same pixels right up until someone moves the
 * token alone. So this file asserts the LITERAL is gone, not that the pixel is
 * 8 — the pixel is the token's business now.
 *
 * FIVE FRAMES, TWO FACTIONS, THREE SURFACE FAMILIES. The owner's ruling is
 * about the frame LIST, not about one card: UA's praxis sheet and task sheet
 * are the same parchment inside the same 2px vermilion frame, and the
 * chronicle, the decree and the WOW feed card have worn one band between them
 * since #2185. A file per surface family would let them drift apart again, so
 * they are pinned together here rather than under `praxisCard/` or `taskCard/`.
 *
 * WHAT IS DELIBERATELY ABSENT. INNER panels were never on the frame list —
 * `WowTaskCard`'s inner 7, `WowProfileBody`, `WowFieldDesk`, `UaTaskDetail` and
 * the rest keep their own literals — so this file matches the FRAME's style
 * attribute rather than grepping the whole document for a radius. And
 * `EphemeristsPraxisCard` draws `borderRadius: 0` against a documented 8 on
 * purpose (recorded in `index.css` beside the token, and its own open design
 * question); the last case holds it OFF the token so a later sweep cannot
 * quietly drag it on.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import "../../i18n";
import type { PraxisCardOut } from "../../api/praxis";
import { aPraxisCard, aTask } from "../../test/fixtures";
import type { AdminProps } from "../praxisCard/shared";
import UaPraxisCard from "../praxisCard/desktop/UaPraxisCard";
import WowPraxisCard from "../praxisCard/desktop/WowPraxisCard";
import EphemeristsPraxisCard from "../praxisCard/desktop/EphemeristsPraxisCard";
import UaTaskCard from "../taskCard/UaTaskCard";
import WowTaskCard from "../taskCard/WowTaskCard";
import WowFeedFrame from "../feed/WowFeedFrame";

// `useTheme()` throws outside a `ThemeProvider` by design (#701) and the score
// stamps reach for it. Nothing here depends on which half it gets.
vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

// The task cards size themselves from the form factor. With no DOM it is an
// input like any other, and the frame's radius does not vary with it.
vi.mock("../../hooks/useFormFactor", () => ({
  useFormFactor: () => "desktop",
}));

const praxis = (slug: string): PraxisCardOut =>
  aPraxisCard({ task_faction_slug: slug, created_by_faction_slug: slug });

const adminProps = (slug: string): AdminProps => ({
  praxis: praxis(slug),
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
  moderateError: null,
});

const taskCardProps = (slug: string) => {
  const task = aTask({ primary_faction_slug: slug });
  return {
    task,
    basePoints: task.point_value,
    multiplier: 1,
    inProgressCount: 0,
    onSignup: () => {},
  };
};

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

/**
 * The FRAME's style attribute: the first one in document order that declares a
 * radius at all.
 *
 * Not simply the ROOT element's, because two of these five cards wrap their
 * frame in a sizing `div` that styles nothing but width. Not a document-wide
 * grep either, because the panels below the frame keep literals of their own on
 * purpose — matching those would fail this file for a change the owner ruled
 * out of scope.
 */
const frameStyle = (html: string): string => {
  const match = /style="([^"]*border-radius[^"]*)"/.exec(html);
  expect(match, "nothing in this card declares a border-radius").not.toBeNull();
  return (match as RegExpExecArray)[1];
};

const CASES = [
  {
    name: "UA's praxis salon sheet",
    key: "ua",
    node: () => <UaPraxisCard praxis={praxis("ua")} adminProps={adminProps("ua")} />,
  },
  { name: "UA's task sheet", key: "ua", node: () => <UaTaskCard {...taskCardProps("ua")} /> },
  {
    name: "the praxis chronicle",
    key: "wow",
    node: () => <WowPraxisCard praxis={praxis("wow")} adminProps={adminProps("wow")} />,
  },
  { name: "the task decree", key: "wow", node: () => <WowTaskCard {...taskCardProps("wow")} /> },
  {
    name: "the WOW feed card",
    key: "wow",
    node: () => (
      <WowFeedFrame kicker="Task completed" time="2h ago" tag={null} archive={null}>
        <p>a body this frame did not mount</p>
      </WowFeedFrame>
    ),
  },
] as const;

/**
 * The frame's radius read from `token` — bare, or through one role read that
 * falls back to it.
 *
 * A #2659 lane moves a surface onto `factionRoleVars`, so the card emits
 * `border-radius:var(--task-card-radius, var(--faction-ua-card-radius))`. Same
 * computed value; the wrapper is allowed exactly one level deep and must fall
 * back to THIS token, so a card that copies the number still fails.
 */
const radiusRead = (token: string) =>
  new RegExp(
    "border-radius:var\\(" +
      token +
      "\\)|border-radius:var\\(--[\\w-]+,\\s*var\\(" +
      token +
      "\\)\\)",
  );

describe("the frame radius is the token, not a copy of it (#2403)", () => {
  for (const { name, key, node } of CASES) {
    it(`${name} reads --faction-${key}-card-radius`, () => {
      expect(frameStyle(render(node()))).toMatch(radiusRead(`--faction-${key}-card-radius`));
    });
  }

  it("Ephemerists keeps its documented 0 and stays off the token", () => {
    const html = render(
      <EphemeristsPraxisCard praxis={praxis("ephemerists")} adminProps={adminProps("ephemerists")} />,
    );
    expect(html).not.toContain("--faction-ephemerists-card-radius");
  });
});
