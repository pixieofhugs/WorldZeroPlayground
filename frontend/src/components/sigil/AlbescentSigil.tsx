import type { CSSProperties } from "react";

/**
 * AlbescentSigil — the labyrinth, with no palette of its own (Sigil Studies v2,
 * reinstated by owner ruling over #1891). Only the mark returns: the NAME stays
 * masked. Safe because it is filled with `--faction-default-rainbow-conic` —
 * a shape, never a livery.
 *
 * A mask over a `public/` asset (as `Enso`): inlining ships one copy per
 * instance, and index.css measured +1.9 KB gzipped on initial CSS. A `contain`
 * mask scales one drawing to every size. Nothing in the markup names the
 * society (#783); hence the asset's neutral filename.
 */

const LABYRINTH_ASSET = "url(/factionMarks/labyrinth.svg)";

interface AlbescentSigilProps {
  /** px, square. */
  size?: number;
  /** Any CSS `background` (the sidebar passes a sampled rainbow window). */
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
  // Decorative (unlike `DefaultSigil`): a label would name a masked society.
  return <span aria-hidden style={maskStyle} />;
}
