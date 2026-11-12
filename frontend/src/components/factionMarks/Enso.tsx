import type { CSSProperties } from "react";
import type { FactionMarkProps } from "./Lotus";

/**
 * Ensō — UA's signature total mark (#839, ADR-0049) and UA's only ensō (#908;
 * `UaSigil` wraps it).
 *
 * A raster WebP painted through a CSS mask: the image is alpha only, colour
 * comes from a token, so it stays tintable (ADR-0049). The vector source is
 * 211 KB gzipped with a displacement filter re-run every paint; the 512px WebP
 * is 31 KB with the filter baked in (<1% alpha error at 96/138/420px).
 *
 * Regenerate from `enso.source.svg` (kept out of `public/`): render to a
 * 512×512 canvas in a browser, flatten RGB to black, export WebP.
 */

/** Under `public/`. */
const ENSO_ASSET = "url(/factionMarks/enso.webp)";

interface EnsoProps extends Omit<FactionMarkProps, "lineColor"> {
  /** For a non-square slot; defaults to `size`. The mask letterboxes. */
  height?: number;
}

export default function Enso({
  size = 138,
  height = size,
  color = "currentColor",
  opacity = 1,
  style,
  className,
}: EnsoProps) {
  const maskStyle: CSSProperties = {
    display: "block",
    width: size,
    height,
    opacity,
    backgroundColor: color,
    WebkitMaskImage: ENSO_ASSET,
    maskImage: ENSO_ASSET,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    ...style,
  };
  return <span aria-hidden style={maskStyle} className={className} />;
}
