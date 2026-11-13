/**
 * The composer error banner's ink seam (#1231). Neutral `--color-danger` misses
 * AA on every composer ground (ratios in `utils/__tests__/factionContrast.test.ts`),
 * so each skin supplies its ink; a skin supplying none must render unchanged.
 * Wash and rule stay neutral on every skin (ADR-0061) — a source guard.
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
  // Own token: Snide's card is black in both themes, so `-card-alarm` is pinned
  // bright and fails on this composer's light sheet.
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
      // The dress shares the constant, so Submit can't change the pairing (ADR-0059).
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
