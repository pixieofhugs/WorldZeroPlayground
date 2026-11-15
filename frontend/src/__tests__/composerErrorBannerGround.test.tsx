/**
 * The composer error banner's ink seam (#1231). Neutral `--color-danger` misses
 * AA on every composer ground (ratios in `utils/__tests__/factionContrast.test.ts`),
 * so each skin supplies its ink; a skin supplying none must render unchanged.
 * Wash and rule stay neutral on every skin (ADR-0061).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../i18n";

import { ErrorBanner } from "../pages/editPraxis/archetypes/shared";
import { aPraxis, anEditPraxisState } from "../test/fixtures";

vi.mock("../hooks/useFormFactor", () => ({ useFormFactor: () => "desktop" }));

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

const SUBMITTED = "2026-02-01T00:00:00Z";

/** `waiting` is the surface Submit swaps in, wearing the composer's dress (ADR-0059). */
async function bannerMarkup(archetype: string, waiting = false) {
  const { default: Composer } = await import(`../pages/editPraxis/archetypes/${archetype}.tsx`);
  const state = anEditPraxisState({
    error: "that did not go in",
    ...(waiting && {
      phase: "waiting" as const,
      praxis: aPraxis({
        type: "collab",
        submitted_at: SUBMITTED,
        submit_proposed_at: SUBMITTED,
        members: [],
      }),
    }),
  });
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <Composer state={state} />
    </MemoryRouter>,
  );
  const tag = html.match(/<div[^>]*role="alert"[^>]*>/)?.[0];
  expect(tag, `${archetype} draws the banner`).toBeDefined();
  return { html, tag: tag! };
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
    "%s hands the banner an ink measured on its own sheet, wash and rule neutral",
    async (archetype, token) => {
      const { tag, html } = await bannerMarkup(archetype);
      expect(tag).toContain(`color:var(${token})`);
      expect(tag).toContain("background:var(--color-danger-veil)");
      expect(tag).toContain("var(--color-danger-edge)");
      expect(html).not.toContain("--color-danger-ring");
    },
  );

  it.each(Object.entries(COMPOSER_ALARM))(
    "%s's Submit dress hands the banner the same alarm",
    async (archetype, token) => {
      const { tag, html } = await bannerMarkup(archetype, true);
      expect(tag).toContain(`color:var(${token})`);
      expect(html).not.toContain("--color-danger-ring");
    },
  );
});
