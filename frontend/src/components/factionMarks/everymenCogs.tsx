import type { CSSProperties } from "react";

/**
 * The Everymen ORNAMENT cog, drawn once (#2121) — every Everymen surface mounts
 * this instead of a private gear (or the U+2699 system glyph, which differs per OS).
 *
 * NOT the sigil: `components/sigil/EverymenSigil` (two cogs in mesh) is the
 * identity mark; this one cog is furniture. Don't collapse them, and keep the
 * sigil out of this module (#2119).
 *
 * Deliberately not here: `components/vote/EverymenVote` keeps its own gear, which
 * needs a filled and an outline-only state built from detached teeth; this mark is
 * one solid path with no outline mode.
 */

/* ── Eight teeth on a hub on a 24-unit square, generated: a hand-written path
 *    drifts from the arithmetic. The design's numbers, raw (§4a). ── */
const TEETH = 8;
const RADIUS = 9.5;
const TIP_LENGTH = 5;
const TIP_HALF = 1.6;
const ROOT_HALF = 2.6;

function buildCogPath(): string {
  const point = (radius: number, angle: number): string =>
    `${12 + radius * Math.cos(angle)},${12 + radius * Math.sin(angle)}`;
  const step = (Math.PI * 2) / TEETH;
  const tipRadius = RADIUS + TIP_LENGTH;
  let path = "";
  for (let tooth = 0; tooth < TEETH; tooth++) {
    const start = tooth * step;
    const rootBefore = point(RADIUS, start - ROOT_HALF / RADIUS);
    const tipBefore = point(tipRadius, start - TIP_HALF / tipRadius);
    const tipAfter = point(tipRadius, start + TIP_HALF / tipRadius);
    const rootAfter = point(RADIUS, start + ROOT_HALF / RADIUS);
    const nextRoot = point(RADIUS, start + step - ROOT_HALF / RADIUS);
    path += `${tooth === 0 ? "M" : "L"}${rootBefore}L${tipBefore}L${tipAfter}L${rootAfter}`;
    path += `A${RADIUS},${RADIUS} 0 0 1 ${nextRoot}`;
  }
  return `${path}Z`;
}

/**
 * The cog path on `viewBox="0 0 24 24"`, built once. Exported for tests and for
 * callers that need the drawing without {@link EverymenCog}'s `<svg>`.
 */
export const EVERYMEN_COG_PATH = buildCogPath();

interface EverymenCogProps {
  /** Drawn width and height in px (§4a). */
  size: number;
  /** A token, never a hex. */
  fill: string;
  /**
   * The bore: an OPAQUE disc in the colour the cog sits ON, not a punch-through.
   */
  hub: string;
  /**
   * Uses the `ep-spin` / `ep-spin-rev` classes so reduced motion stills it (#1003).
   */
  spin?: "forward" | "reverse";
  /** Re-times the turn via `--ep-spin-dur`. */
  duration?: string;
  opacity?: number;
}

/** The union cog. Ornament only, so `aria-hidden` here, not at call sites. */
export function EverymenCog({
  size,
  fill,
  hub,
  spin,
  duration,
  opacity,
}: EverymenCogProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={
        spin === "forward" ? "ep-spin" : spin === "reverse" ? "ep-spin-rev" : undefined
      }
      style={{
        display: "block",
        flex: "0 0 auto",
        opacity,
        ...(duration ? ({ "--ep-spin-dur": duration } as CSSProperties) : {}),
      }}
    >
      <path d={EVERYMEN_COG_PATH} fill={fill} />
      <circle cx="12" cy="12" r="3" fill={hub} />
    </svg>
  );
}
