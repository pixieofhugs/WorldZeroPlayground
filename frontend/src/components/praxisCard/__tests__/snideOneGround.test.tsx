/**
 * #2177 — S.N.I.D.E. wears ONE ground, with one exception.
 *
 * THE SEAM IS THE CARD'S RENDERED FRAME plus the class the container hangs the
 * exception on. Both halves need a test and neither is visible to the other:
 *
 *  - the FRAME's dress is markup this file can read. What it cannot read is the
 *    cascade, so the assertion is that every value the two dresses disagree
 *    about arrives through the `--snd-praxis-*` channel WITH the wall as its
 *    fallback. A dress that hard-coded the wall would render identically here
 *    and ignore the detail row entirely;
 *  - the HOOK is `.snd-detail-praxis` on the task-detail gallery row. The issue
 *    rules out `.praxis-gallery` explicitly — `WowFactionBody` mounts that one
 *    too, and a Snide-task praxis lands on the WOW faction page — so this file
 *    also asserts the negative: no rule in index.css paints a praxis card black
 *    off `.praxis-gallery`.
 *
 * WHAT IS NOT HERE: the ratios. `factionContrast.test.ts` (SNIDE_WALL_PAIRS)
 * measures both dresses' inks on all four readings of the wall and on the slab,
 * in both themes, which is the half that actually gates the ruling.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run), so these
 * are assertions about markup given props — never interaction.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import type { PraxisCardOut } from "../../../api/praxis";
import SnidePraxisCard from "../desktop/SnidePraxisCard";
import { readIndexCss } from "../../../test/indexCss";

// `useTheme()` throws outside a `ThemeProvider` by design (#701) and the score
// stamp reaches for it. Mocked rather than wrapped, the shape `covenSlipSheet`
// established: the theme is an input here, and nothing this file asserts
// depends on which half it gets — that is the point of a token dress.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

/** Comments stripped: this file reads RULES, and every claim below is also
 *  spelt out in prose beside the rules it is about. */
const CSS = stripComments(
  readIndexCss(),
);

function praxis(overrides: Partial<PraxisCardOut> = {}): PraxisCardOut {
  return {
    id: 1,
    title: "Fly-posted the whole of Corporation Street",
    task_id: 4,
    task_title: "Say the thing nobody will put their name to",
    created_by_id: 7,
    created_by_display_name: "Vex",
    created_by_faction_slug: "snide",
    created_by_avatar_url: "",
    task_faction_slug: "snide",
    task_level_required: 2,
    task_point_value: 12,
    member_count: 1,
    score: 13.6,
    display_multiplier: 1,
    metatask_points: 0,
    points_from_votes: 4,
    voter_count: 3,
    is_top_for_task: false,
    media_items: [],
    applied_metatasks: [],
    ...overrides,
  } as PraxisCardOut;
}

const adminProps = {
  praxis: praxis(),
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
} as unknown as Parameters<typeof SnidePraxisCard>[0]["adminProps"];

const html = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <SnidePraxisCard praxis={praxis()} adminProps={adminProps} />
    </MemoryRouter>,
  );

/** Four proof tiles, which is one past the three the gallery shows: the "+N"
 *  badge is the slot that paints the frame's `paper`. */
const withMedia = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <SnidePraxisCard
        praxis={praxis({
          media_items: [1, 2, 3, 4].map((id) => ({
            id,
            file_path: `proof-${id}.jpg`,
            type: "image",
          })),
        } as Partial<PraxisCardOut>)}
        adminProps={adminProps}
      />
    </MemoryRouter>,
  );

const frame = () => {
  const markup = html();
  return markup.slice(0, markup.indexOf(">"));
};

describe("the S.N.I.D.E. praxis card wears the wall (#2177)", () => {
  it("grounds on the five-layer wall, not the evidence plate", () => {
    const outer = frame();
    expect(outer, "the ramp").toContain("var(--faction-snide-wall)");
    expect(outer, "the acid corner").toContain("var(--faction-snide-note-wash-acid)");
    expect(outer, "the pink corner").toContain("var(--faction-snide-note-wash-pink)");
    // The plate the card used to print on, and the 3px dot tooth over it: the
    // wall carries its own raster, and stacking both is noise.
    expect(outer, "the retired plate").not.toContain("background:var(--faction-snide-card-bg)");
    expect(outer, "the retired tooth").not.toContain("--faction-snide-slab-tooth");
  });

  it("reads the inks that FLIP with that ground, not the slab's", () => {
    // The trap #2066 named, from the other side: `-card-text` is cream in both
    // themes because its ground is black in both. On a ground that flips it is
    // cream type on a cream wall for half the day.
    const markup = html();
    expect(markup, "the card's own copy").toContain("--faction-snide-note-ink");
    expect(markup, "the card's muted tier").toContain("--faction-snide-note-muted");
    expect(markup, "the accent that is text on the wall").toContain(
      "--faction-snide-note-pink-ink",
    );
  });

  it("takes each of those from the container's channel, wall as the fallback", () => {
    // The dress the detail row overrides. Hard-coding the wall renders the same
    // markup and silently ignores the exception, which is why the FALLBACK form
    // is what this asserts rather than the value.
    const markup = html();
    for (const channel of ["ground", "ink", "muted", "accent"]) {
      expect(markup, `--snd-praxis-${channel}`).toContain(`var(--snd-praxis-${channel},`);
    }
    // `paper` — the disc behind a proof tile's "+N" and a roster monogram — only
    // renders with something to count, so it takes a card that has proof on it.
    expect(withMedia(), "--snd-praxis-paper").toContain("var(--snd-praxis-paper,");
    // The frame that re-points the shared slots' functional inks (`sheetInk`
    // takes no prop), which is the other half of the switch.
    expect(markup, "the frame class").toContain("snd-praxis-frame");
  });
});

describe("the black exception is scoped to task detail alone (#2177)", () => {
  it("hangs on the detail row's own class", () => {
    const [block] = ruleBodies(CSS, ".snd-detail-praxis");
    expect(block, ".snd-detail-praxis rule must exist").toBeDefined();
    expect(block, "the black ground").toContain("--snd-praxis-ground: var(--faction-snide-card-bg)");
    // Black is a TOKEN and the ink family that was measured on it comes with it.
    expect(block, "the slab's ink").toContain("--snd-praxis-ink: var(--faction-snide-card-text)");
    expect(block, "no literal").not.toContain("#000");
  });

  it("does NOT reach for .praxis-gallery, which WowFactionBody also mounts", () => {
    // `.praxis-gallery` reads like "the task-detail row" and is not: scoping the
    // exception there would blacken Snide praxis cards on the WOW faction page.
    // It keeps its one job — narrowing `--praxis-card-basis` to 320px (#1137).
    for (const body of [
      ...ruleBodies(CSS, ".praxis-gallery"),
      ...ruleBodies(CSS, ".praxis-gallery > *"),
    ]) {
      expect(body, "the gallery row stays out of S.N.I.D.E.'s dress").not.toContain("--snd-praxis-");
      expect(body).not.toContain("--faction-snide");
    }
  });
});
