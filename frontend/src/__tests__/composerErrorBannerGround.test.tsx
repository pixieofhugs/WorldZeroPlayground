/**
 * The composer error banner's ground seam (#1231).
 *
 * `ErrorBanner` took no props, so every one of the eight composers painted the
 * neutral `--color-danger` on its own faction sheet and no skin could reach it
 * — WORLD_ZERO_STYLE §3's #1153 case, a missing seam rather than a missing
 * measurement. It matters because the neutral ink misses AA on ALL EIGHT
 * composer grounds in light under its own veil (3.31:1 on the Ephemerists plate
 * up to 4.41:1 on the na sheet); the per-ground ratios are asserted in
 * `utils/__tests__/factionContrast.test.ts`, and this file pins the SEAM those
 * ratios are only reachable through.
 *
 * Two claims, and the second is the one #1153 says to write down: a skin that
 * supplies an ink gets it, and a skin that supplies NOTHING renders exactly
 * what the banner painted before. A default that drifts is how a "byte
 * identical" seam quietly repaints eight surfaces.
 *
 * The third claim is a source guard, because it is unreachable from markup: the
 * banner's WASH and RULE must stay the neutral `--color-danger-*` rungs on
 * every skin. ADR-0061 — danger is the platform speaking, not a faction — and a
 * `style` prop generous enough to carry the ink is also generous enough to
 * repaint the veil, which is the thing that ruling forbids.
 *
 * `renderToStaticMarkup` only — no jsdom, effects never run.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";

import { ErrorBanner } from "../pages/editPraxis/archetypes/shared";

const ARCHETYPE_DIR = fileURLToPath(
  new URL("../pages/editPraxis/archetypes/", import.meta.url),
);

/** slug → the alarm token that composer hands the banner. */
const COMPOSER_ALARM: Record<string, string> = {
  DefaultEditPraxis: "--faction-default-card-alarm",
  CovenEditPraxis: "--faction-coven-card-alarm",
  EphemeristsEditPraxis: "--faction-ephemerists-card-alarm",
  EverymenEditPraxis: "--faction-everymen-card-alarm",
  SingularityEditPraxis: "--faction-singularity-card-alarm",
  // The one mint. Its CARD is photocopier-black in both themes (§6), so
  // `-card-alarm` is pinned bright and reads 1.56:1 on the light xerox stock —
  // while this composer's sheet flips.
  SnideEditPraxis: "--faction-snide-composer-alarm",
  UaEditPraxis: "--faction-ua-card-alarm",
  WowEditPraxis: "--faction-wow-card-alarm",
};

function source(name: string): string {
  return readFileSync(`${ARCHETYPE_DIR}${name}.tsx`, "utf8");
}

describe("the composer error banner's ground seam", () => {
  it("takes the ink a skin supplies", () => {
    const html = renderToStaticMarkup(
      <ErrorBanner
        message="that did not go in"
        style={{ color: "var(--faction-ua-card-alarm)" }}
      />,
    );
    expect(html).toContain("var(--faction-ua-card-alarm)");
    expect(html).not.toContain("var(--color-danger)");
  });

  it("keeps today's rendering for a skin that supplies none", () => {
    const bare = renderToStaticMarkup(<ErrorBanner message="nope" />);
    const undefinedStyle = renderToStaticMarkup(
      <ErrorBanner message="nope" style={undefined} />,
    );
    expect(bare).toBe(undefinedStyle);
    expect(bare).toContain("color:var(--color-danger)");
    expect(bare).toContain("background:var(--color-danger-veil)");
    expect(bare).toContain("border:1px solid var(--color-danger-edge)");
  });

  it("renders nothing when there is no message", () => {
    expect(
      renderToStaticMarkup(
        <ErrorBanner message="" style={{ color: "var(--faction-wow-card-alarm)" }} />,
      ),
    ).toBe("");
  });

  it.each(Object.entries(COMPOSER_ALARM))(
    "%s hands the banner an ink measured on its own sheet",
    (archetype, token) => {
      const text = source(archetype);
      expect(text).toContain(`const ALARM = "var(${token})";`);
      expect(text).toContain(
        "<ErrorBanner message={state.error} style={{ color: ALARM }} />",
      );
      // The dress carries the same constant, so pressing Submit cannot change
      // the pairing under the banner (ADR-0059, and the reason the dress passes
      // ELEMENTS rather than copies).
      expect(text).toContain("alarm: ALARM,");
    },
  );

  it("leaves the wash and the rule neutral on every skin (ADR-0061)", () => {
    for (const archetype of Object.keys(COMPOSER_ALARM)) {
      const text = source(archetype);
      expect(text).not.toContain("--color-danger-veil");
      expect(text).not.toContain("--color-danger-edge");
      expect(text).not.toContain("--color-danger-ring");
    }
  });
});
