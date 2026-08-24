import type { CSSProperties } from "react";

/**
 * AlbescentSigil — THE LABYRINTH, and no palette of its own (Sigil Studies v2).
 *
 * Three nested rings, each a band that turns back on itself. It asks the only
 * question this society ever asks: not where are you, but how did you get here.
 *
 * THIS FILE IS A REINSTATEMENT, and the scope of it is narrow. #1891 / PR #1926
 * deleted `AlbescentSigil` by owner ruling hours before this design was drawn.
 * The mark then was a surveyor's cross-hair inked on the `--albescent-reveal-*`
 * register (always-light then; it flips since #2301), and a distinct emblem in a distinct PALETTE,
 * worn by an otherwise-hidden faction on surfaces an unrevealed player reads, is
 * a tell. The owner has ruled that this design supersedes that deletion. **Only
 * the mark comes back.** Every other half of #1891/#1926 is untouched and still
 * correct — `factionName()` still masks the NAME, the choosers still drop the
 * row rather than showing it, and the `join_albescent` ladder rung is still
 * filtered server-side. Nothing here decides what the faction is called.
 *
 * What makes the return safe is the paint, and it is the design's: the labyrinth
 * carries NO hue of its own. It is filled with `--faction-default-rainbow-conic`
 * — the same spectrum `DefaultSigil` sweeps and an unaffiliated player wears —
 * so what is new is a SHAPE, not a livery. The society still has no colour
 * anyone could point at.
 *
 * A MASK OVER A `public/` ASSET, which is `Enso`'s delivery and for the same two
 * reasons. The drawing is ~3.2 KB of path data: inlining it would ship one copy
 * per rendered instance (the players roster draws a column of them), and putting
 * it in `index.css` measured **+1.9 KB gzipped on the initial CSS**, which took
 * the payload past the budget's warn line for one faction's mark. As an asset it
 * is non-blocking, cached after first paint, and costs the initial load nothing.
 * The file supplies only the ALPHA; the colour comes from `background`, i.e.
 * from a token, so the mark follows the `[data-theme="dark"]` cascade with no
 * ternary.
 *
 * The design's own after-band is `clip-path: path('...')`, which takes ABSOLUTE
 * units — which is why the study ships three hand-scaled copies of the path, one
 * per size. A mask at `contain` scales natively, so ONE drawing serves every
 * size a caller asks for; the vendored 84px variant is canonical, being the
 * highest-precision of the three.
 *
 * Nothing in the markup names the society: an `id`, a class or a label carrying
 * the word would print its name into the DOM of every page the mark appears on
 * (#783). The asset's filename says "labyrinth" for the same reason.
 */

/** Where the alpha stencil lives under `public/`. */
const LABYRINTH_ASSET = "url(/factionMarks/labyrinth.svg)";

interface AlbescentSigilProps {
  /** px, square. */
  size?: number;
  /**
   * What to paint the labyrinth with instead of the whole conic sweep. Any CSS
   * `background` value, not just a colour — the mark is PAINTED through a mask
   * rather than stroked, exactly as `DefaultSigil` is, so a caller can hand it
   * the position-sampled window of `--faction-default-rainbow` the sidebar's
   * neutral rows get. Named `color` to line up with `FactionSigilProps`, so a
   * caller reaching this through the dispatcher spells it the way the other
   * eight marks do.
   */
  color?: string;
}

export default function AlbescentSigil({ size = 22, color }: AlbescentSigilProps) {
  const maskStyle: CSSProperties = {
    display: "block",
    width: size,
    height: size,
    flex: "none",
    background: color ?? "var(--faction-default-rainbow-conic)",
    WebkitMaskImage: LABYRINTH_ASSET,
    maskImage: LABYRINTH_ASSET,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
  // Decorative, like the other eight faction marks and UNLIKE `DefaultSigil` —
  // the surface that mounts the mark is what names the faction, through the
  // masked `factionName()`. A `role="img"` with a label of its own would both
  // double up the sidebar row's own label and put this component in the business
  // of naming a society whose name is masked everywhere else.
  return <span aria-hidden style={maskStyle} />;
}
