/**
 * #2177 — S.N.I.D.E. wears ONE ground (the wall), with one exception: black on
 * the task-detail row via `.snd-detail-praxis`. The frame must read every
 * disputed value through `--snd-praxis-*` with the wall as fallback, and nothing
 * may hang on `.praxis-gallery` (WowFactionBody mounts it too). Ratios live in
 * `factionContrast.test.ts` (SNIDE_WALL_PAIRS). SSR-only.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import "../../../i18n";
import { ruleBodies, stripComments } from "../../../utils/__tests__/cssVars";
import type { PraxisCardOut } from "../../../api/praxis";
import SnidePraxisCard from "../desktop/SnidePraxisCard";
import { readIndexCss } from "../../../test/indexCss";

// `useTheme()` throws outside a `ThemeProvider` (#701); the score stamp uses it.
vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggle: () => {} }),
}));

/** Comments stripped: rules only. */
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

/** Four tiles, one past the gallery's three: the "+N" badge paints `paper`. */
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
    // The wall carries its own raster; the old plate + tooth would be noise.
    expect(outer, "the retired plate").not.toContain("background:var(--faction-snide-card-bg)");
    expect(outer, "the retired tooth").not.toContain("--faction-snide-slab-tooth");
  });

  it("reads the inks that FLIP with that ground, not the slab's", () => {
    // #2066's trap: `-card-text` is cream in both themes, so cream on cream here.
    const markup = html();
    expect(markup, "the card's own copy").toContain("--faction-snide-note-ink");
    expect(markup, "the card's muted tier").toContain("--faction-snide-note-muted");
    expect(markup, "the accent that is text on the wall").toContain(
      "--faction-snide-note-pink-ink",
    );
  });

  it("takes each of those from the container's channel, wall as the fallback", () => {
    // Assert the FALLBACK form: a hard-coded wall renders the same but ignores the exception.
    const markup = html();
    for (const channel of ["ground", "ink", "muted", "accent"]) {
      expect(markup, `--snd-praxis-${channel}`).toContain(`var(--snd-praxis-${channel},`);
    }
    // `paper` only renders with something to count.
    expect(withMedia(), "--snd-praxis-paper").toContain("var(--snd-praxis-paper,");
    // The frame class re-points the shared slots' functional inks.
    expect(markup, "the frame class").toContain("snd-praxis-frame");
  });
});

describe("the black exception is scoped to task detail alone (#2177)", () => {
  it("hangs on the detail row's own class", () => {
    const [block] = ruleBodies(CSS, ".snd-detail-praxis");
    expect(block, ".snd-detail-praxis rule must exist").toBeDefined();
    expect(block, "the black ground").toContain("--snd-praxis-ground: var(--faction-snide-card-bg)");
    expect(block, "the slab's ink").toContain("--snd-praxis-ink: var(--faction-snide-card-text)");
    expect(block, "no literal").not.toContain("#000");
  });

  it("does NOT reach for .praxis-gallery, which WowFactionBody also mounts", () => {
    // It keeps one job: narrowing `--praxis-card-basis` to 320px (#1137).
    for (const body of [
      ...ruleBodies(CSS, ".praxis-gallery"),
      ...ruleBodies(CSS, ".praxis-gallery > *"),
    ]) {
      expect(body, "the gallery row stays out of S.N.I.D.E.'s dress").not.toContain("--snd-praxis-");
      expect(body).not.toContain("--faction-snide");
    }
  });
});
