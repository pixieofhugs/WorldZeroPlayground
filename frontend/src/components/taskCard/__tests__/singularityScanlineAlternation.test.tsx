/**
 * Singularity's ornament is the SCANLINE — one drawing, and it alternates
 * (#2394, phase 3 of #2195).
 *
 * ## The seam
 *
 * `the ground a page declared` → `the standing raster in each card's markup`.
 * Both Singularity card families are rendered under a real
 * `BackdropContext.Provider` and their markup read back
 * (`renderToStaticMarkup`, the SSR-only harness the rest of the card suites
 * use — no DOM, no layout, no computed styles). Three claims live here and no
 * other file can see any of them:
 *
 *  1. **ONE PITCH.** The task card drew `0 1px / 1px 3px` off
 *     `--faction-singularity-term-scan`; the praxis card drew a second raster,
 *     `0 2px / 2px 3px`, off a private `--faction-singularity-scanline` at a
 *     third of the alpha. Owner-ruled one drawing per faction, so the praxis
 *     card takes the task card's — the one the other six Singularity surfaces
 *     already draw — and the private token is retired. The test asserts the
 *     retirement in `index.css` too, or the token would sit there dead and the
 *     next surface would pick the wrong one back up.
 *  2. **IT ALTERNATES.** `useGroundIsBusy()` true ⇒ the raster is GONE, not
 *     swapped for something quieter ("either burst, or plain", owner
 *     2026-08-17). False ⇒ it is worn.
 *  3. **CHROME NEVER BRANCHES.** The terminal frame, the window band and the
 *     `.sg-scan` sweep are identical on both grounds. The alternation governs
 *     the card's BACKGROUND texture and nothing else.
 *
 * Only ONE route makes the predicate true today — a character profile of a
 * player whose faction paints a pattern. A faction's own page is exempt (owner,
 * 2026-08-18) and claims it through `useFactionBackdrop`, and every other route
 * themes nothing. That is why the ground is injected through the context
 * provider here rather than through a page: the provider IS the seam, and
 * `useFactionBackdrop` sets the slug from an effect, which never runs in this
 * harness.
 *
 * WHAT IS NOT HERE: whether it looks right at either card size. That is visual
 * QA and is stated as outstanding on the PR.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";

// The praxis card's score stamp reaches for `useTheme()`, which throws outside a
// `ThemeProvider` by design (#701). Mocked rather than wrapped, the shape
// `snideOneGround.test.tsx` established: nothing asserted below depends on which
// half it gets — Singularity's terminal tokens are theme-invariant (§6).
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "dark", toggle: () => {} }),
}));

import SingularityTaskCard from "../SingularityTaskCard";
import { SingularityPraxisCard } from "../../praxisCard/desktop/SingularityPraxisCard";
import { BackdropContext } from "../../backdrop/BackdropContext";
import { aTask, aPraxisCard } from "../../../test/fixtures";
import { readIndexCss } from "../../../test/indexCss";

const CSS = readIndexCss();

/**
 * THE one Singularity raster, byte for byte as six other surfaces in the kit
 * already write it (the comment voice, the feed frame, the select card, the
 * profile body, the edit-praxis panel and both detail pages).
 */
const RASTER =
  "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)";

/** The retired second pitch, in the two spellings it could come back as. */
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

/** Render both card families on a page ground of `slug`. */
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
    // ...and it is gone from the sheet, not merely unused: a dead declaration
    // is the next surface's wrong answer.
    expect(CSS, "the retired declaration").not.toContain(`${OLD_TOKEN}:`);
  });
});

describe("the scanline alternates with the ground (#2195)", () => {
  it("is worn on every unthemed route — the site-wide default", () => {
    const { task, praxis } = onGround(null);
    expect(task).toContain(RASTER);
    expect(praxis).toContain(RASTER);
  });

  it("is worn on a WASH, so a Coven or UA profile keeps it", () => {
    for (const slug of ["coven", "ua"]) {
      const { task, praxis } = onGround(slug);
      expect(task, `${slug} task`).toContain(RASTER);
      expect(praxis, `${slug} praxis`).toContain(RASTER);
    }
  });

  it("DROPS on a patterned ground — any faction's, not just its own", () => {
    // Owner ruled (a): the predicate is any ornamented ground. A Singularity
    // card on the Everymen wall is still two textures fighting.
    for (const slug of ["singularity", "everymen", "snide", "ephemerists", "wow"]) {
      const { task, praxis } = onGround(slug);
      expect(task, `${slug} task`).not.toContain(RASTER);
      expect(praxis, `${slug} praxis`).not.toContain(RASTER);
    }
  });

  it("leaves the ground BARE — no substitute texture", () => {
    // "Either burst, or plain" (owner, 2026-08-17). The only thing that may
    // replace the raster is nothing.
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

  it("is worn on a faction page, which is exempt (owner, 2026-08-18)", () => {
    const { task, praxis } = onGround("singularity", true);
    expect(task, "task card on its own faction page").toContain(RASTER);
    expect(praxis, "praxis card on its own faction page").toContain(RASTER);
  });
});

describe("chrome never branches on the ground", () => {
  it("keeps the frame, the window band and the sweep on a busy ground", () => {
    const plain = onGround(null);
    const busy = onGround("everymen");
    for (const key of ["task", "praxis"] as const) {
      // The scan SWEEP is motion chrome, not the ornament: `.sg-scan` owns the
      // resting offset and the reduced-motion-guarded travel, and it survives.
      expect(busy[key], `${key}: the sweep`).toContain("sg-scan");
      expect(plain[key], `${key}: the sweep`).toContain("sg-scan");
      // The terminal frame token is in both dresses.
      expect(busy[key], `${key}: a frame`).toContain("--faction-singularity-");
    }
    // The window band (#2185) is the same bar on both cards and both grounds.
    const band = (html: string) => html.includes("SINGULARITY") || html.includes("singularity");
    expect(band(busy.task) && band(busy.praxis), "the window band").toBe(true);
  });
});
