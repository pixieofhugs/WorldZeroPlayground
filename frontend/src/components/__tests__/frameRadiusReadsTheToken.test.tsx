/**
 * #2403: every UA and WOW card FRAME reads `--faction-{key}-card-radius` rather
 * than restating the number (token vs prose is `factionCardFrame.test.ts`).
 * The five frames are pinned together so they cannot drift apart. Inner panels
 * keep their own literals, and `EphemeristsPraxisCard`'s deliberate 0 stays
 * off the token.
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
import { resolveRoleReads } from "../../test/sourceScan";

// `useTheme()` throws outside a `ThemeProvider` (#701); the score stamps use it.
vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

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
 * The FRAME's style attribute: the first that declares a radius. Not the root
 * (two cards wrap the frame in a sizing div), and not document-wide (inner
 * panels keep their literals).
 */
const frameStyle = (html: string): string => {
  const match = /style="([^"]*border-radius[^"]*)"/.exec(html);
  expect(match, "nothing in this card declares a border-radius").not.toBeNull();
  // Fold a role read (`var(--leaf-task-card-radius)`) down to its token (#2674).
  return resolveRoleReads((match as RegExpExecArray)[1]);
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

/** The radius read from `token`; a card that copies the number still fails. */
const radiusRead = (token: string) => `border-radius:var(${token})`;

describe("the frame radius is the token, not a copy of it (#2403)", () => {
  for (const { name, key, node } of CASES) {
    it(`${name} reads --faction-${key}-card-radius`, () => {
      expect(frameStyle(render(node()))).toContain(radiusRead(`--faction-${key}-card-radius`));
    });
  }

  it("Ephemerists keeps its documented 0 and stays off the token", () => {
    const html = render(
      <EphemeristsPraxisCard praxis={praxis("ephemerists")} adminProps={adminProps("ephemerists")} />,
    );
    expect(html).not.toContain("--faction-ephemerists-card-radius");
  });
});
