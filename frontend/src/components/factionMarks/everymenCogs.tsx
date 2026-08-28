import type { CSSProperties } from "react";

/**
 * The Everymen's ORNAMENT cog, drawn once (#2121).
 *
 * Everymen was the last of the four dressed factions with no shared kit module,
 * and it cost exactly what the others' modules were created to stop: six
 * surfaces, six private drawings of the same device. The census on #2121 (and
 * re-derived against `main` before this landed) found
 *
 *   • the task card, the composer and the task-detail sheet each generating an
 *     eight-tooth gear from the SAME arithmetic in three separate copies — the
 *     composer's copy carries a comment saying so and naming this extraction;
 *   • the mobile field desk drawing a `CogSeal`: eight detached rect teeth
 *     around a stroked ring, a different device wearing the same name;
 *   • the praxis-detail sheet printing the literal character U+2699 GEAR under a
 *     comment claiming "a drawn character, not an icon (§7)". It is neither drawn nor
 *     ours: it renders in whatever the system font has, which is a different
 *     gear on every OS and the pair of shapes the bug report screenshotted.
 *
 * So the mark is drawn ONCE here, in the shape `covenSlip` / `snideAtoms` /
 * `wowMobile` already established. Change the geometry here and every Everymen
 * surface follows; add a seventh mount and it is already correct.
 *
 * ## This is NOT the faction's sigil, and must not become it
 *
 * `components/sigil/EverymenSigil` is TWO COGS IN MESH and it is the identity
 * mark — the hero seal, the avatar badge, the faction card. This is one cog and
 * it is FURNITURE: it flanks a masthead, it strikes a rule, it heads a section.
 * Two devices, two jobs, exactly as Coven keeps `CovenSigil` apart from `Spark`,
 * and #2119's lesson in `snideAtoms` — a module holding a second copy of a
 * faction's sigil is how surfaces import the wrong mark — is why this module
 * holds no sigil at all. Do not collapse them.
 *
 * ## What is deliberately NOT here
 *
 * `components/vote/EverymenVote` draws its own gear and keeps it. The gearworks
 * rating row needs a gear with TWO states — a filled one for a reached tier and
 * a thin edge-only outline for an unreached one — built from detached teeth so
 * the outline reads as a rim rather than as a filled disc's silhouette. This
 * mark is a solid single path with an opaque hub and has no outline mode; giving
 * it one would be a second drawing living in one file, which is the thing #2121
 * closed. That is the reason, recorded at the mount as the ruling asks.
 */

/* ── The geometry. Eight teeth on a hub, on a 24-unit square, generated rather
 *    than drawn: no hand-written path holds this legibly at the six sizes the
 *    surfaces mount it at (13, 14, 15, 16, 40), and a hand-written copy drifts
 *    from the arithmetic silently. The numbers are the design's own and are the
 *    values all three generating copies already agreed on — this consolidation
 *    repaints nothing. Ornament geometry, kept raw (§4a). ── */
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
 * The one Everymen cog path, on `viewBox="0 0 24 24"`. Built once at module
 * load — it is a constant, not a render-time computation.
 *
 * Exported so a test can assert that what a surface renders IS this string, and
 * so a caller that needs the outline without {@link EverymenCog}'s `<svg>`
 * wrapper can reach the drawing rather than re-deriving it.
 */
export const EVERYMEN_COG_PATH = buildCogPath();

interface EverymenCogProps {
  /** Drawn width and height in px. Ornament geometry (§4a). */
  size: number;
  /** The teeth and rim. A token, never a hex. */
  fill: string;
  /**
   * The bore. Named `hub` rather than `hole`, which two of the copies called it:
   * it is an OPAQUE disc painted in the ground behind it, not a punch-through.
   * (The sigil's bores really are punched, by `fill-rule: evenodd` — a different
   * mark making a different promise.) Pass the colour the cog is sitting ON.
   */
  hub: string;
  /**
   * Turn the cog. Reaches the shared `ep-spin` / `ep-spin-rev` classes rather
   * than an inline `animation:`, so the mark stills itself under
   * `prefers-reduced-motion` (#1003). Only the composer turns its cogs.
   */
  spin?: "forward" | "reverse";
  /** Re-times the turn via `--ep-spin-dur`, without a second keyframe. */
  duration?: string;
  /** Ornament dimming, where a mount wants the cog to recede. */
  opacity?: number;
}

/**
 * The union cog. ORNAMENT ONLY — it is `aria-hidden` here rather than at each
 * call site, because there is no reading of this mark that carries meaning a
 * screen reader needs; the label it flanks is always the content.
 */
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
