import type { CSSProperties, ReactElement } from "react";

/**
 * UaMandala — UA's signature pattern as one parameterized primitive (#849).
 * No per-surface geometry.
 *
 * Strengths: `full` (vote-control weight), `texture` (6-22% behind a surface:
 * backdrop, hero, join card), `absent` (dense surfaces; renders `null`, so the
 * placement ruling lives in the type).
 *
 * Colour is a token (default `--faction-ua-glow`, ornament-only). Motion is
 * reduced-motion-gated classes in `motion.ornament.css`, never inline
 * `animation:`; this only passes per-band tempo. Geometry is raw (§4a).
 */

type UaMandalaStrength = "full" | "texture" | "absent";

/** `texture` sits mid-range of 6-22%. */
const STRENGTH_OPACITY: Record<UaMandalaStrength, number> = {
  full: 1,
  texture: 0.14,
  absent: 0,
};

interface UaMandalaProps {
  /** px, square. */
  size?: number;
  strength?: UaMandalaStrength;
  rings?: number;
  /** Alternate bands offset by half a petal. */
  petalsPerRing?: number;
  /** Degrees. */
  rotation?: number;
  /** Overrides the strength's default (0-1). */
  opacity?: number;
  /** Ornament hue by default; never pass an ink token. */
  color?: string;
  /** Reduced-motion gated. */
  spin?: boolean;
  /**
   * Petal pop + hue cycle, staggered by band (#2072). Reduced-motion gated;
   * stilled, it is the untouched figure. Not combinable with `spin` (both
   * animate `transform`).
   */
  pulse?: boolean;
  /**
   * Outer circle. The task card's CTA flank turns it off (#2031) so it doesn't
   * read as a second boxed seal beside the button.
   */
  boundary?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** 100x100 user space, scaled by `size`. */
const BOX = 100;
const CENTRE = BOX / 2;
const MAX_RADIUS = CENTRE * 0.94;
const HUB_RADIUS = CENTRE * 0.13;
/** Arc radius / petal length. Must exceed 0.5; larger is slimmer. */
const PETAL_CURVE = 0.62;

/** A symmetric lens (vesica) petal; simpler than the vote widget's brush petal. */
function lensPetal(angle: number, inner: number, outer: number): string {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const baseX = CENTRE + dirX * inner;
  const baseY = CENTRE + dirY * inner;
  const tipX = CENTRE + dirX * outer;
  const tipY = CENTRE + dirY * outer;
  const radius = (outer - inner) * PETAL_CURVE;
  return (
    `M ${baseX.toFixed(2)} ${baseY.toFixed(2)}` +
    ` A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${tipX.toFixed(2)} ${tipY.toFixed(2)}` +
    ` A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${baseX.toFixed(2)} ${baseY.toFixed(2)} Z`
  );
}

/** Per-band tempo for `.ua-mandala-ring`. */
function bandMotion(band: number): CSSProperties {
  return {
    ["--ua-grow-delay" as string]: `${band * 0.08}s`,
    ["--ua-spin-dur" as string]: `${44 + band * 12}s`,
    ["--ua-spin-dir" as string]: band % 2 === 0 ? "reverse" : "normal",
  };
}

/**
 * Outer bands sit back for depth. One expression: it is both `opacity` and the
 * pulse plateau, which must match.
 */
function bandAlpha(band: number): number {
  return 1 - (band - 1) * 0.14;
}

/**
 * Pulse tempo (#2072) for `.ua-mandala-pulse`, staggered by band index (not
 * `nth-child`; ring count varies). Negative hue delay starts bands mid-cycle.
 * `--ua-band-alpha` is the plateau so popping keeps the depth. Integer tenths
 * avoid float noise (`0.4 + 1.4`).
 */
function bandPulse(band: number): CSSProperties {
  return {
    ["--ua-band-alpha" as string]: `${bandAlpha(band)}`,
    ["--ua-pop-delay" as string]: `${((band - 1) * 8) / 10}s`,
    ["--ua-hue-delay" as string]: `${-(4 + (band - 1) * 14) / 10}s`,
  };
}

/** First band inner, last outer, the rest mid, for any ring count. */
function pulseBand(band: number, rings: number): string {
  if (band === 1) return "ua-mandala-pulse--inner";
  if (band === rings) return "ua-mandala-pulse--outer";
  return "ua-mandala-pulse--mid";
}

export default function UaMandala({
  size = 240,
  strength = "texture",
  rings = 3,
  petalsPerRing = 12,
  rotation = 0,
  opacity,
  color = "var(--faction-ua-glow)",
  spin = false,
  pulse = false,
  boundary = true,
  className,
  style,
}: UaMandalaProps) {
  if (strength === "absent") return null;

  const figureOpacity = opacity ?? STRENGTH_OPACITY[strength];
  const bandDepth = (MAX_RADIUS - HUB_RADIUS) / rings;

  const bands: ReactElement[] = [];
  for (let band = 1; band <= rings; band += 1) {
    const inner = HUB_RADIUS + bandDepth * (band - 1);
    const outer = inner + bandDepth;
    // Half-petal offset reads as a weave, not spokes.
    const phase = band % 2 === 0 ? Math.PI / petalsPerRing : 0;
    const petals: ReactElement[] = [];
    for (let index = 0; index < petalsPerRing; index += 1) {
      const angle = (index / petalsPerRing) * Math.PI * 2 + phase;
      petals.push(<path key={index} d={lensPetal(angle, inner, outer)} />);
    }
    const classes = [
      spin && "ua-mandala-ring",
      pulse && "ua-mandala-pulse",
      pulse && pulseBand(band, rings),
    ].filter(Boolean);
    bands.push(
      <g
        key={band}
        className={classes.length ? classes.join(" ") : undefined}
        style={
          spin || pulse
            ? { ...(spin ? bandMotion(band) : null), ...(pulse ? bandPulse(band) : null) }
            : undefined
        }
        opacity={bandAlpha(band)}
      >
        {petals}
      </g>,
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${BOX} ${BOX}`}
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: "block", opacity: figureOpacity, ...style }}
    >
      <g transform={`rotate(${rotation} ${CENTRE} ${CENTRE})`} fill={color}>
        {bands}
      </g>
      <g
        transform={`rotate(${rotation} ${CENTRE} ${CENTRE})`}
        fill="none"
        stroke={color}
        strokeWidth="0.6"
        opacity={0.7}
      >
        <circle cx={CENTRE} cy={CENTRE} r={HUB_RADIUS} />
        {boundary && <circle cx={CENTRE} cy={CENTRE} r={MAX_RADIUS} />}
      </g>
    </svg>
  );
}
