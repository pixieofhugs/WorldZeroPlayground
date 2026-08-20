/**
 * #2403 — the UA and chronicle frames read the radius token instead of
 * restating it.
 *
 * THE SEAM is the card's own `style` attribute against
 * `--faction-{key}-card-radius`. #2361 minted that token from `frameBase`'s
 * prose and deliberately left the cards on literals, because moving them was
 * not then a no-op: UA drew 7 and the chronicle drew 9 against a documented 7
 * and 9, and the owner had not yet ruled on the numbers. #2403 rules both to 8,
 * so for these two cards — and only these two — reading the token IS a no-op,
 * and the number stops being copied.
 *
 * `factionCardFrame.test.ts` holds the OTHER half: token against prose. It
 * cannot see this one, because a card that hardcodes 8 resolves the same list
 * to the same pixels right up until someone moves the token alone. So this file
 * asserts the LITERAL is gone, not that the pixel is 8 — the pixel is the
 * token's business now.
 *
 * NOT EPHEMERISTS. `EphemeristsPraxisCard` draws `borderRadius: 0` against a
 * documented 8 on purpose (recorded in `index.css` beside the token, and its
 * own open design question), so it is not on the token and must not be dragged
 * onto it by a well-meaning sweep.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";
import "../../../i18n";
import type { PraxisCardOut } from "../../../api/praxis";
import { aPraxisCard } from "../../../test/fixtures";
import type { AdminProps } from "../shared";
import UaPraxisCard from "../desktop/UaPraxisCard";
import WowPraxisCard from "../desktop/WowPraxisCard";
import EphemeristsPraxisCard from "../desktop/EphemeristsPraxisCard";

// `useTheme()` throws outside a `ThemeProvider` by design (#701) and the score
// stamps reach for it. Nothing here depends on which half it gets.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
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

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

/** The frame is the root element, so its style attribute is the first one. */
const frameStyle = (html: string): string => {
  const match = /style="([^"]*)"/.exec(html);
  expect(match, "the card rendered no styled frame").not.toBeNull();
  return (match as RegExpExecArray)[1];
};

describe("the frame radius is the token, not a copy of it (#2403)", () => {
  it("UA's salon sheet reads --faction-ua-card-radius", () => {
    const style = frameStyle(render(<UaPraxisCard praxis={praxis("ua")} adminProps={adminProps("ua")} />));
    expect(style).toContain("border-radius:var(--faction-ua-card-radius)");
  });

  it("the chronicle reads --faction-wow-card-radius", () => {
    const style = frameStyle(render(<WowPraxisCard praxis={praxis("wow")} adminProps={adminProps("wow")} />));
    expect(style).toContain("border-radius:var(--faction-wow-card-radius)");
  });

  it("Ephemerists keeps its documented 0 and stays off the token", () => {
    const style = frameStyle(
      render(<EphemeristsPraxisCard praxis={praxis("ephemerists")} adminProps={adminProps("ephemerists")} />),
    );
    expect(style).not.toContain("--faction-ephemerists-card-radius");
  });
});
