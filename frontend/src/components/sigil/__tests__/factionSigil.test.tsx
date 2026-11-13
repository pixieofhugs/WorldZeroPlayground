/** FactionSigil dispatcher (#659, ADR-0040); fallback as `factionAvatar.test.tsx`. */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import FactionSigil from "../FactionSigil";
import { resolveVariant } from "../../../utils/factionDispatch";
import { FACTION_MANIFESTS, surfaceMap } from "../../../factions";
import UaMandala from "../../factionMarks/UaMandala";

describe("FactionSigil dispatcher (#659)", () => {
  it("renders the UA ensō for the ua slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // The vendored brush ensō via a CSS mask (#908), not the old 200x200 arcs.
    expect(html).toContain("/factionMarks/enso.webp");
    expect(html).not.toContain('viewBox="0 0 200 200"');
  });

  it("delivers the mark as a mask, so the asset stays out of the JS bundle", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    expect(html).toMatch(/mask-image:url\(\/factionMarks\/enso\.webp\)/);
    // Non-square callers must not stretch the circle.
    expect(html).toContain("mask-size:contain");
    expect(html).toContain("mask-position:center");
  });

  it("draws the ensō in the ornament token so it follows the dark cascade", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    expect(html).toContain("background-color:var(--faction-ua-glow)");
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("#");
  });

  it("renders the S.N.I.D.E. brushed A for the snide slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="snide" />);
    expect(html).toContain("var(--faction-snide-acid)");
    // Filled, not stroked, so it holds at 15px; the viewBox bleeds for the legs.
    expect(html).toContain('viewBox="-8 -8 116 116"');
    expect(html).toContain("rotate(-22 50 50)");
    expect(html.match(/<path /g), "ring, two legs, crossbar").toHaveLength(4);
    expect(html).not.toContain('viewBox="0 0 48 48"');
  });

  it("renders the Everymen meshed cogs for the everymen slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="everymen" />);
    expect(html).toContain("var(--everymen-red)");
    // Bores punched by evenodd; a second ink (`cream`) muddied at 15px.
    expect(html).toContain('fill-rule="evenodd"');
    expect(html).not.toContain("var(--everymen-cream)");
  });

  it("renders the Cozy Coven witch hat for the coven slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="coven" />);
    expect(html).toContain("var(--faction-coven)");
    // The brim's opening curve, and the evenodd rule the six discs need.
    expect(html).toContain("M4 78C14 66 32 62 50 62");
    expect(html).toContain('fill-rule="evenodd"');
    expect(html).not.toContain('viewBox="0 0 24 24"');
  });

  it("renders the labyrinth for the albescent slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" />);
    expect(html).toContain("/factionMarks/labyrinth.svg");
    expect(html.match(/<line /g), "no cross-hair ticks").toBeNull();
  });

  it("falls back to the unaffiliated ring for an unknown slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="totally-unknown" />);
    expect(html).toContain("var(--faction-default-rainbow-conic)");
    expect(html).not.toContain("var(--faction-snide-acid)");
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("var(--everymen-red)");
  });

  it("falls back to the unaffiliated ring for a null slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug={null} />);
    expect(html).toContain("var(--faction-default-rainbow-conic)");
  });
});

/**
 * Albescent's labyrinth (Sigil Studies v2, superseding #1891 ruling 6). What
 * makes it safe is that it introduces **no colour**; asserted on the
 * dispatcher's markup. Whether it READS at 15px is beyond this harness.
 */
describe("Albescent's labyrinth (Sigil Studies v2)", () => {
  it("no longer draws what an unknown slug draws", () => {
    const albescent = renderToStaticMarkup(<FactionSigil slug="albescent" size={40} />);
    const unknown = renderToStaticMarkup(<FactionSigil slug="not_a_faction" size={40} />);
    expect(albescent).not.toBe(unknown);
    expect(albescent).toContain("/factionMarks/labyrinth.svg");
    expect(unknown).not.toContain("/factionMarks/labyrinth.svg");
  });

  it("carries no palette of its own — the unaffiliated conic and nothing else", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" />);
    expect(html).not.toMatch(/var\(--faction-albescent/);
    expect(html).not.toContain("#");
  });

  it("takes a caller's paint, so the rail can sample the ramp per row", () => {
    // Masked, so `color` is any `background`; the sidebar's rows rely on it.
    const sampled = "var(--faction-default-rainbow) 40% 0 / 600% 100%";
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" color={sampled} />);
    expect(html).toContain(sampled);
  });

  it("keeps no trace of the cross-hair", () => {
    for (const html of [
      renderToStaticMarkup(<FactionSigil slug="albescent" />),
      renderToStaticMarkup(<FactionSigil slug="albescent" color="var(--color-text-tertiary)" />),
    ]) {
      expect(html).not.toContain("<linearGradient");
      expect(html).not.toContain("<line ");
    }
  });

  it("never puts the word in the markup", () => {
    // The NAME stays masked (#1891/#1926); a slug-derived id would leak it (#783).
    for (const size of [15, 22, 84]) {
      const html = renderToStaticMarkup(<FactionSigil slug="albescent" size={size} />);
      expect(html.toLowerCase(), `${size}px`).not.toContain("albescent");
    }
  });

  it("renders at every size the study shows, and at the app's own mounts", () => {
    for (const size of [84, 34, 15, 44, 26, 18]) {
      const html = renderToStaticMarkup(<FactionSigil slug="albescent" size={size} />);
      expect(html, `${size}px`).toContain(`width:${size}px`);
      expect(html, `${size}px`).toContain(`height:${size}px`);
    }
  });
});

/**
 * The manifest is the whole map (#2529): nothing added at the call site. Goes
 * red on a census hole or a call-site spread (a refactor dropped this mark once,
 * see `Sidebar.tsx`). Byte-identity, because #2529 was a migration.
 */
describe("every sigil the dispatcher draws comes out of the manifest (#2529)", () => {
  // Read off the manifest (#2815), plus the two deliberate non-rows.
  const SLUGS: ReadonlyArray<string | null> = [
    ...FACTION_MANIFESTS.map((manifest) => manifest.slug),
    "not_a_faction",
    null,
  ];

  // The mounts in the tree, plus the 64px step the avatar's ring gates on.
  const SIZES = [15, 18, 22, 26, 34, 40, 42, 44, 64, 84];

  it.each(SLUGS.map((slug) => [String(slug), slug] as const))(
    "%s renders identically through surfaceMap('sigil') alone",
    (_label, slug) => {
      const Variant = resolveVariant(surfaceMap("sigil"), slug);
      for (const size of SIZES) {
        expect(
          renderToStaticMarkup(<FactionSigil slug={slug} size={size} />),
          `${slug} at ${size}px`,
        ).toBe(renderToStaticMarkup(<Variant size={size} />));
      }
    },
  );

  it("keeps the caller's paint on the same path", () => {
    const sampled = "var(--faction-default-rainbow) 40% 0 / 600% 100%";
    for (const slug of SLUGS) {
      const Variant = resolveVariant(surfaceMap("sigil"), slug);
      expect(
        renderToStaticMarkup(<FactionSigil slug={slug} color={sampled} />),
        String(slug),
      ).toBe(renderToStaticMarkup(<Variant color={sampled} />));
    }
  });

  it("answers for albescent out of the map, not out of the call site", () => {
    // Census: the two above stay green with both a spread AND the row.
    const map = surfaceMap("sigil");
    expect(map["albescent"]).toBeDefined();
    expect(renderToStaticMarkup(<FactionSigil slug="albescent" size={40} />)).toContain(
      "/factionMarks/labyrinth.svg",
    );
  });
});

/** Count petal paths — every band draws its petals as <path> elements. */
function petalCount(html: string): number {
  return (html.match(/<path/g) ?? []).length;
}

describe("UaMandala primitive (#849)", () => {
  it("renders nothing at all for the absent strength", () => {
    // Not a transparent figure still costing a hundred paths.
    expect(renderToStaticMarkup(<UaMandala strength="absent" />)).toBe("");
  });

  it("is faint texture at 6-22% by default and solid at full strength", () => {
    const texture = renderToStaticMarkup(<UaMandala />);
    const opacity = Number(texture.match(/opacity:([\d.]+)/)?.[1]);
    expect(opacity).toBeGreaterThanOrEqual(0.06);
    expect(opacity).toBeLessThanOrEqual(0.22);
    expect(renderToStaticMarkup(<UaMandala strength="full" />)).toContain("opacity:1");
  });

  it("draws rings x petals-per-ring petals, both parameterized", () => {
    expect(petalCount(renderToStaticMarkup(<UaMandala rings={3} petalsPerRing={12} />))).toBe(36);
    expect(petalCount(renderToStaticMarkup(<UaMandala rings={5} petalsPerRing={8} />))).toBe(40);
  });

  it("applies rotation to the figure", () => {
    expect(renderToStaticMarkup(<UaMandala rotation={18} />)).toContain("rotate(18 50 50)");
  });

  it("takes its colour from a token, never a hex", () => {
    const html = renderToStaticMarkup(<UaMandala strength="full" />);
    expect(html).toContain("var(--faction-ua-glow)");
    expect(html).not.toContain("#");
  });

  it("keeps motion in the shared reduced-motion-gated class, never inline", () => {
    const still = renderToStaticMarkup(<UaMandala strength="full" />);
    expect(still).not.toContain("ua-mandala-ring");
    const spinning = renderToStaticMarkup(<UaMandala strength="full" spin />);
    expect(spinning).toContain('class="ua-mandala-ring"');
    expect(spinning).not.toContain("animation:");
    expect(spinning).toContain("--ua-spin-dur");
  });
});

/**
 * Every adapter that can take a caller's ink, does (#2635): UA's once accepted
 * `color` and dropped it, invisible to the block above. `DefaultSigil`/na is
 * excluded: the conic has no single colour to override.
 */
describe("a sigil adapter never swallows the caller's ink", () => {
  const INK = "var(--color-text-tertiary)";

  it.each(["ua", "coven", "snide", "ephemerists", "singularity", "everymen", "wow", "albescent"])(
    "%s paints in the colour it is handed",
    (slug) => {
      expect(
        renderToStaticMarkup(<FactionSigil slug={slug} color={INK} />),
        `${slug}'s adapter accepts \`color\` and must forward it — a prop that type-checks and does nothing is invisible to every other guard here`,
      ).toContain(INK);
    },
  );
});
