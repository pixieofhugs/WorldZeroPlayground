/**
 * FactionSigil dispatcher (#659, ADR-0040). Confirms the map resolves the
 * bespoke sigil per faction slug and falls back to the unaffiliated
 * seven-segment `DefaultSigil` ring for an unknown/null slug — the same
 * fallback contract as `FactionAvatar` (see factionAvatar.test.tsx).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import "../../../i18n";
import FactionSigil from "../FactionSigil";
import { resolveVariant } from "../../../utils/factionDispatch";
import { surfaceMap } from "../../../factions";
import UaMandala from "../../factionMarks/UaMandala";

describe("FactionSigil dispatcher (#659)", () => {
  it("renders the UA ensō for the ua slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // One ensō (#908): the vendored brush drawing, painted through a CSS mask.
    // The two-arc approximation on a 200x200 viewBox is gone, and so is the
    // 100x120 gilt shield it replaced.
    expect(html).toContain("/factionMarks/enso.webp");
    expect(html).not.toContain('viewBox="0 0 200 200"');
  });

  it("delivers the mark as a mask, so the asset stays out of the JS bundle", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // The file supplies the ALPHA only; nothing is inlined and no <path> for
    // the mark reaches the markup.
    expect(html).toMatch(/mask-image:url\(\/factionMarks\/enso\.webp\)/);
    // Letterboxed and centred, so non-square callers do not stretch the circle.
    expect(html).toContain("mask-size:contain");
    expect(html).toContain("mask-position:center");
  });

  it("draws the ensō in the ornament token so it follows the dark cascade", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="ua" />);
    // The mask takes its ink from background-color — i.e. from a token.
    expect(html).toContain("background-color:var(--faction-ua-glow)");
    // The salon is dead: no gilt shield, no legacy gold, no raw hex.
    expect(html).not.toMatch(/var\(--ua-[a-z]/); // the whole legacy family, deleted in #853
    expect(html).not.toContain("#");
  });

  it("renders the S.N.I.D.E. brushed A for the snide slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="snide" />);
    expect(html).toContain("var(--faction-snide-acid)");
    // Sigil Studies v2: four FILLED shapes cantered at -22deg, on a viewBox
    // that bleeds 8 units past the drawing so the legs break out of the ring.
    // The old mark was stroked on a 48-unit square; both facts are the reason
    // it held at 84px and smudged at 15.
    expect(html).toContain('viewBox="-8 -8 116 116"');
    expect(html).toContain("rotate(-22 50 50)");
    expect(html.match(/<path /g), "ring, two legs, crossbar").toHaveLength(4);
    expect(html).not.toContain('viewBox="0 0 48 48"');
  });

  it("renders the Everymen meshed cogs for the everymen slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="everymen" />);
    expect(html).toContain("var(--everymen-red)");
    // Sigil Studies v2: two cogs, one path, bores punched by evenodd rather
    // than filled with a second ink. `--everymen-cream` was the old hub disc
    // and is what a scaled-down single gear turned to mud at 15px.
    expect(html).toContain('fill-rule="evenodd"');
    expect(html).not.toContain("var(--everymen-cream)");
  });

  it("renders the Cozy Coven witch hat for the coven slug", () => {
    const html = renderToStaticMarkup(<FactionSigil slug="coven" />);
    expect(html).toContain("var(--faction-coven)");
    // Sigil Studies v2: the brim's opening curve, and the evenodd rule the six
    // discs need. The four-point sparkle that used to answer here is now
    // `covenSlip`'s `Spark`, an ornament rather than a badge.
    expect(html).toContain("M4 78C14 66 32 62 50 62");
    expect(html).toContain('fill-rule="evenodd"');
    expect(html).not.toContain('viewBox="0 0 24 24"');
  });

  // #1626 gave albescent its own adapter row here, holding the surveyor's
  // cross-hair; #1891 deleted it; Sigil Studies v2 reinstates it holding the
  // labyrinth, by owner ruling. Since #2529 `factions/albescent.ts` REGISTERS
  // that row like every other faction/surface pair — it used to be spread into
  // the map at the call site, which is the bypass the block at the bottom of
  // this file now pins. Asserted in full further down.
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
 * Albescent's labyrinth — the mark reinstated (Sigil Studies v2, superseding
 * #1891 ruling 6).
 *
 * This block has asserted three different things in three issues, and the
 * reason it keeps moving is worth stating once. #1658 asserted a cross-hair
 * stroked in the spectrum; #1891 asserted no mark at all, because a distinct
 * emblem in a distinct PALETTE, worn by an otherwise-hidden faction on surfaces
 * an unrevealed player reads, is a tell. The design answers the palette half —
 * the labyrinth carries no hue of its own — and the owner has accepted the
 * remaining shape half. So what is asserted here is not just "a mark exists"
 * but the property that makes the mark safe: it introduces **no colour**.
 *
 * The seam is the DISPATCHER's markup, because that is where the decision
 * lives: the primitive draws whatever it is handed, and `CredentialCard` and
 * the filter facet stay slug-blind.
 *
 * NOT ASSERTED, and no test here can: whether the mark READS at 15px. The
 * harness is `renderToStaticMarkup` — no DOM, no layout, no rasterisation.
 */
describe("Albescent's labyrinth (Sigil Studies v2)", () => {
  it("no longer draws what an unknown slug draws", () => {
    // The exact inverse of #1891's assertion, and the one line that says the
    // ruling was reversed rather than the mark quietly re-added somewhere else.
    const albescent = renderToStaticMarkup(<FactionSigil slug="albescent" size={40} />);
    const unknown = renderToStaticMarkup(<FactionSigil slug="not_a_faction" size={40} />);
    expect(albescent).not.toBe(unknown);
    expect(albescent).toContain("/factionMarks/labyrinth.svg");
    expect(unknown).not.toContain("/factionMarks/labyrinth.svg");
  });

  it("carries no palette of its own — the unaffiliated conic and nothing else", () => {
    // This is the property that makes reinstating the mark safe. The drawing
    // is an alpha stencil under `public/`; the PAINT is the same spectrum na
    // wears — so a
    // stranger meets a shape and never a livery.
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" />);
    expect(html).not.toContain("var(--albescent-reveal-text)");
    expect(html).not.toContain("var(--albescent-reveal-ink)");
    expect(html).not.toMatch(/var\(--faction-albescent/);
    expect(html).not.toContain("#");
  });

  it("takes a caller's paint, so the rail can sample the ramp per row", () => {
    // The mark is painted through a mask rather than stroked — the same
    // mechanism as `DefaultSigil` — so `color` is any `background`, not just a
    // colour. The sidebar's neutral rows rely on that shape.
    const sampled = "var(--faction-default-rainbow) 40% 0 / 600% 100%";
    const html = renderToStaticMarkup(<FactionSigil slug="albescent" color={sampled} />);
    expect(html).toContain(sampled);
  });

  it("keeps no trace of the cross-hair", () => {
    // The old mark was seven parts stroked from an in-document
    // `<linearGradient>`. None of it survives, coloured or not.
    for (const html of [
      renderToStaticMarkup(<FactionSigil slug="albescent" />),
      renderToStaticMarkup(<FactionSigil slug="albescent" color="var(--color-text-tertiary)" />),
    ]) {
      expect(html).not.toContain("<linearGradient");
      expect(html).not.toContain("<line ");
    }
  });

  it("never puts the word in the markup", () => {
    // UNCHANGED BY THE REINSTATEMENT, and deliberately: #1891/#1926's mask on
    // the NAME is untouched and still correct. A slug-derived id, class or
    // label would print the society's name into the DOM of every page the mark
    // appears on — the leak #783 closed. Only the mark came back.
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
 * THE MANIFEST IS THE WHOLE MAP (#2529).
 *
 * The seam is `resolveVariant(surfaceMap('sigil'), slug)` — the map on its own,
 * with nothing added at the call site. `FactionSigil` used to spread
 * `{ albescent: AlbescentSigilAdapter, ...surfaceMap('sigil') }`, so the
 * labyrinth reached the screen without ever appearing in `ALBESCENT_MANIFEST`:
 * a bypass `SURFACE_KEYS_ARE_EXHAUSTIVE` cannot see, because it is not a new
 * surface key but a slug injected into an existing map.
 *
 * Two things go red here if it comes back, and both matter:
 *
 *   1. the census lie — `surfaceMap('sigil')` must ANSWER for albescent rather
 *      than report a hole the dispatcher quietly patches;
 *   2. the deletion hazard — the mark must render the SAME through the map
 *      alone as through the dispatcher. `Sidebar.tsx` records that a refactor
 *      already dropped this mark once with nothing going red.
 *
 * Byte-identity is asserted rather than "contains the asset" on purpose: #2529
 * is a migration, not a redesign, so a pixel that moves means the move was
 * wrong. Every size the app mounts is walked because the comparison is over
 * inline style, where the size is the only thing that varies.
 */
describe("every sigil the dispatcher draws comes out of the manifest (#2529)", () => {
  // Every game slug, plus the two fall-through cases. `na` is a state rather
  // than a faction and deliberately has no manifest, so it must resolve exactly
  // the way an unknown slug does.
  const SLUGS = [
    "coven",
    "snide",
    "ephemerists",
    "singularity",
    "everymen",
    "ua",
    "wow",
    "albescent",
    "na",
    "not_a_faction",
    null,
  ] as const;

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
    // The sidebar's neutral rows hand the mark a position-sampled window of the
    // ramp, so `color` has to survive the map lookup as well as the size does.
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
    // The census assertion. Without it the two above stay green if someone
    // re-adds the spread AND the manifest row — a slower version of the same
    // bug, since the call site would win again.
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
    // Dense/text-heavy surfaces ask for `absent` and must get no figure —
    // not a transparent one still costing a hundred paths.
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
    // The keyframes live in index.css; the component only hands over tempo.
    expect(spinning).not.toContain("animation:");
    expect(spinning).toContain("--ua-spin-dur");
  });
});

/**
 * EVERY ADAPTER THAT CAN TAKE A CALLER'S INK, DOES (#2635).
 *
 * `UaSigilAdapter` destructured `{ size }` only, under a comment claiming "the
 * ensō draws --faction-ua-glow internally; it has no color prop" — and `UaSigil`
 * has taken one since #908, defaulting to that same glow. So a caller's ink was
 * accepted by the type, dropped on the floor, and the mark carried on in the
 * faction's ornament orange. Nothing could see it: the block above compares the
 * dispatcher against the adapter, and both dropped it identically.
 *
 * It surfaced when #2635 painted UA's masthead band in the faction's own hue,
 * where `--faction-ua-glow` is 1.30:1 — `markColor` is exactly the prop for that
 * and it reached nothing. The two mounts that pass one (`CardMasthead`'s
 * `markColor`, the filter facet's `factionCssVar(slug)`) both ask for the same
 * thing, so the fix is one line at the seam and this is the guard.
 *
 * `DefaultSigil` and na's ring are correctly excluded: that mark IS the
 * unaffiliated conic and has no single colour to override.
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
