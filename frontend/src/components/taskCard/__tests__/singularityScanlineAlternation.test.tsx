/**
 * Singularity's one ornament is the SCANLINE (#2394): ONE pitch on both card
 * families (the private praxis token is retired from index.css too); it DROPS on
 * a patterned ground, leaving it bare; chrome never branches. The ground is
 * injected via the provider: `useFactionBackdrop` sets it from an effect,
 * which never runs under SSR.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

// The score stamp's `useTheme()` throws outside a `ThemeProvider` (#701).
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark", toggle: () => {} }),
}));

import SingularityTaskCard from "../SingularityTaskCard";
import { SingularityPraxisCard } from "../../praxisCard/desktop/SingularityPraxisCard";
import { BackdropContext } from "../../backdrop/BackdropContext";
import { aTask, aPraxisCard } from "../../../test/fixtures";
import { readIndexCss } from "../../../test/indexCss";

const CSS = readIndexCss();

/** The one Singularity raster, as the rest of the kit writes it. */
const RASTER =
  "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)";

/** The retired second pitch. */
const OLD_PITCH = "transparent 0 2px";
const OLD_TOKEN = "--faction-singularity-scanline";

const TASK = aTask({ primary_faction_slug: "singularity" });
const PRAXIS = aPraxisCard({
  task_faction_slug: "singularity",
  created_by_faction_slug: "singularity",
});

const adminProps = {
  praxis: PRAXIS,
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
} as unknown as Parameters<typeof SingularityPraxisCard>[0]["adminProps"];

function onGround(
  slug: string | null,
  cardsKeepOrnament = false,
): { task: string; praxis: string } {
  const under = (node: React.ReactNode) =>
    renderToStaticMarkup(
      <BackdropContext.Provider
        value={{ slug, cardsKeepOrnament, setGround: () => {} }}
      >
        <MemoryRouter>{node}</MemoryRouter>
      </BackdropContext.Provider>,
    );
  return {
    task: under(
      <SingularityTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={0}
        onSignup={() => {}}
      />,
    ),
    praxis: under(
      <SingularityPraxisCard praxis={PRAXIS} adminProps={adminProps} />,
    ),
  };
}

describe("one scanline pitch, not two (#2394)", () => {
  it("draws the SAME raster on both card families", () => {
    const { task, praxis } = onGround(null);
    expect(task, "task card").toContain(RASTER);
    expect(praxis, "praxis card").toContain(RASTER);
  });

  it("retires the praxis card's second pitch and its private token", () => {
    const { praxis } = onGround(null);
    expect(praxis, "the 0 2px phase").not.toContain(OLD_PITCH);
    expect(praxis, "the private token").not.toContain(OLD_TOKEN);
    // A dead declaration is the next surface's wrong answer.
    expect(CSS, "the retired declaration").not.toContain(`${OLD_TOKEN}:`);
  });
});

describe("the scanline alternates with the ground (#2195)", () => {
  it("leaves the ground BARE — no substitute texture", () => {
    const { task, praxis } = onGround("everymen");
    for (const [name, html] of [
      ["task", task],
      ["praxis", praxis],
    ] as const) {
      expect(html, `${name}: no second raster`).not.toContain(
        "repeating-linear-gradient",
      );
    }
  });
});

describe("chrome never branches on the ground", () => {
  it("keeps the frame, the window band and the sweep on a busy ground", () => {
    const plain = onGround(null);
    const busy = onGround("everymen");
    for (const key of ["task", "praxis"] as const) {
      // The sweep is motion chrome, not the ornament.
      expect(busy[key], `${key}: the sweep`).toContain("sg-scan");
      expect(plain[key], `${key}: the sweep`).toContain("sg-scan");
      expect(busy[key], `${key}: a frame`).toContain("--faction-singularity-");
    }
    const band = (html: string) => html.includes("SINGULARITY") || html.includes("singularity");
    expect(band(busy.task) && band(busy.praxis), "the window band").toBe(true);
  });
});
