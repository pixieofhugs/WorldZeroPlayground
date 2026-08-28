import type { CSSProperties } from "react";
import type { FactionMarkProps } from "./Lotus";

/**
 * Ensō — UA's signature total mark (#839, ADR-0049), vendored from the design
 * bundle's `enso-detailed.svg`.
 *
 * WHY THIS ONE IS NOT AN INLINE `<svg>`, AND WHY IT IS A RASTER
 * -------------------------------------------------------------
 * ADR-0049's requirement is that a mark be TINTABLE FROM A TOKEN — never a
 * frozen hex that dark mode cannot reach. Inlining is one way to satisfy that;
 * it is not the only one. So it ships as a static asset painted through a CSS
 * mask: the image supplies only the ALPHA, and the colour comes from
 * `background-color`, i.e. from a token. Dark mode still flows through the
 * `[data-theme="dark"]` cascade and no hex reaches the markup. `Lotus` — 9 KB
 * and multi-stop — stays inline, where a mask could not carry its gradients.
 *
 * The source drawing is a 705 KB / 211 KB-gzipped SVG: 284 brush strokes at
 * 0.12–0.22 opacity under an feTurbulence + feDisplacementMap filter. Two costs
 * came with shipping it as a vector, and the mask is why neither had to be paid:
 *
 *   - BYTES. 211 KB gzipped for one decorative mark.
 *   - PAINT. The displacement filter re-runs over all 284 paths on every render,
 *     so a task list showing twenty UA cards paid for it twenty times.
 *
 * Rasterising to a 512px WebP costs 31 KB — 6.8× smaller — and bakes the filter
 * in, so the roughening is computed once, here, instead of on every paint. The
 * mask never used the drawing's colour (three orange tones the alpha channel
 * discards), so nothing is lost that was not already being thrown away.
 *
 * 512px covers every call site: the largest legible render is the 138px score
 * stamp, and the only bigger one is a 420px backdrop watermark at 0.06 opacity.
 * Measured alpha error against the vector is under 1% at 96/138/420px.
 *
 * The source SVG lives beside this file as `enso.source.svg` — kept out of
 * `public/` so it is never served. To regenerate: render it to a 512×512 canvas
 * in a browser (which applies the SVG filter), flatten RGB to black so only the
 * alpha plane carries data, and export WebP.
 *
 * Both export the same component shape, so call sites do not care which
 * mechanism is underneath.
 *
 * This is UA's ONLY ensō (#908). The two-arc approximation that `UaSigil` used
 * to draw is gone; `UaSigil` is now a thin wrapper over this component, so the
 * mark is one drawing delivered one way at every size from 13px to 420px.
 */

/** Where the asset lives under `public/`. */
const ENSO_ASSET = "url(/factionMarks/enso.webp)";

interface EnsoProps extends Omit<FactionMarkProps, "lineColor"> {
  /**
   * Box height, when the mark must fill a non-square slot. Defaults to
   * {@link FactionMarkProps.size}, so the ordinary call stays square. The mask
   * is `contain`/`center`, so a non-square box letterboxes the circle rather
   * than stretching it — the same read the old inline `<svg>` got from the
   * default `preserveAspectRatio`.
   */
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
    // The asset is the alpha channel; the colour is a token the theme owns.
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
