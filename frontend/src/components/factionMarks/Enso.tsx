import type { CSSProperties } from "react";
import type { FactionMarkProps } from "./Lotus";

/**
 * Ensō — UA's signature total mark (#839, ADR-0049), vendored from the design
 * bundle's `enso-detailed.svg`.
 *
 * WHY THIS ONE IS NOT AN INLINE `<svg>`
 * -------------------------------------
 * ADR-0049's requirement is that a mark be TINTABLE FROM A TOKEN — never a
 * frozen hex that dark mode cannot reach. Inlining is one way to satisfy that;
 * it is not the only one. The ensō is a 705 KB brush study: 284 stroked paths
 * plus a turbulence filter, all in exactly one colour. Inlining that would drop
 * three quarters of a megabyte into the main JS bundle for a decorative mark.
 *
 * So it ships as a static asset and is painted through a CSS mask: the SVG
 * supplies only the ALPHA, and the colour comes from `background-color`, i.e.
 * from a token. Dark mode still flows through the `[data-theme="dark"]` cascade,
 * no hex reaches the markup, and 705 KB stays out of the JS bundle and gets
 * cached on its own. `Lotus` — 9 KB and multi-stop — stays inline, where a mask
 * could not carry its gradients.
 *
 * Both export the same component shape, so call sites do not care which
 * mechanism is underneath.
 */

/** Where the asset lives under `public/`. */
const ENSO_ASSET = "url(/factionMarks/enso.svg)";

export default function Enso({
  size = 138,
  color = "currentColor",
  opacity = 1,
  style,
  className,
}: Omit<FactionMarkProps, "lineColor">) {
  const maskStyle: CSSProperties = {
    display: "block",
    width: size,
    height: size,
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
