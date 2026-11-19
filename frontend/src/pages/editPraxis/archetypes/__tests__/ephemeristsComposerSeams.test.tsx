/**
 * The Ephemerists composer's own root sets the label and link seams (#1636, #1800):
 * unset, `.label-caption` reads 2.01:1 and prose links 2.60:1 on the night sheet.
 * Measured on the rendered root, for the composer and the waiting surface alike.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../../i18n";

import EphemeristsEditPraxis from "../EphemeristsEditPraxis";
import { aPraxis, anEditPraxisState } from "../../../../test/fixtures";

vi.mock("../../../../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));

const SUBMITTED = "2026-02-01T00:00:00Z";

function html(waiting: boolean): string {
  const state = anEditPraxisState(
    waiting
      ? {
          phase: "waiting" as const,
          praxis: aPraxis({
            type: "collab",
            submitted_at: SUBMITTED,
            submit_proposed_at: SUBMITTED,
            members: [],
          }),
        }
      : {},
  );
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsEditPraxis state={state} />
    </MemoryRouter>,
  );
}

describe.each([
  ["the composer", false],
  ["the waiting surface", true],
])("%s root", (_name, waiting) => {
  const markup = html(waiting);
  it.each([
    ["--label-ink", "var(--faction-ephemerists-plate-quiet)"],
    ["--link-ink", "var(--faction-ephemerists-plate-brass-light)"],
    ["--link-ink-hover", "var(--faction-ephemerists-plate-ink)"],
  ])("sets %s", (seam, token) => {
    expect(markup).toContain(`${seam}:${token}`);
  });
});
