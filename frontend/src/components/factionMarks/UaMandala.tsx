import type { CSSProperties, ReactElement } from "react";

/**
 * UaMandala — UA's signature pattern as ONE parameterized primitive (#849,
 * brief §5).
 *
 * The redesign's pattern is a mandala: radial, concentric, patient geometry.
 * Every UA surface that wants it takes it from here. It is deliberately not
 * per-surface geometry — a hero with its own hand-tuned rosette and a join card
 * with another is the expensive wrong answer, and the kit says so.
 *
 * THREE STRENGTHS, and the third one is nothing:
 *
 *   • `full` — the vote control, and only the vote control. That surface is
 *     already built ({@link ../vote/UaVote}), where the mandala's rings are
 *     driven by the rank being read rather than by props; `full` here is the
 *     same weight for anything that later needs it.
 *   • `texture` — 6-22% behind a surface: page backdrop, faction hero, join
 *     card. Pattern you feel rather than read.
 *   • `absent` — dense and text-heavy surfaces: feed rows, comments, task
 *     lists, the editor. Renders `null`. This is a strength, not a missing
 *     case: a surface asks for `absent` and gets nothing, so the ruling about
 *     where the pattern may appear lives in the type rather than in a comment
 *     someone has to remember.
 *
 * Colour arrives as a token (default --faction-ua-glow, the ornament-only hue),
 * so the figure follows the `[data-theme="dark"]` cascade with no ternary. All
 * motion is the reduced-motion-gated `.ua-mandala-ring` class from index.css —
 * never an inline `animation:`. Geometry numbers are raw by design: this is
 * ornament, and ornament does not sit on the type/space scales (§4a).
 */

/** How loudly the pattern speaks on a surface. `absent` draws nothing. */
export type UaMandalaStrength = "full" | "texture" | "absent";

/** Default opacity per strength. `texture` sits mid-range of the kit's 6-22%. */
const STRENGTH_OPACITY: Record<UaMandalaStrength, number> = {
  full: 1,
  texture: 0.14,
  absent: 0,
};

export interface UaMandalaProps {
  /** Rendered box, in px. The figure is square and fills it. */
  size?: number;
  /** Which of the three strengths this surface is entitled to. */
  strength?: UaMandalaStrength;
  /** Concentric bands of petals, from the hub outward. */
  rings?: number;
  /** Petals in each band. Alternate bands are offset by half a petal. */
  petalsPerRing?: number;
  /** Whole-figure rotation, in degrees. */
  rotation?: number;
  /** Override the strength's default opacity (0-1). */
  opacity?: number;
  /** Any colour token. Ornament hue by default — never pass an ink token. */
  color?: string;
  /** Turn the bands slowly, alternating direction. Reduced-motion gated. */
  spin?: boolean;
  /**
   * Draw the outermost circle that closes the petals into a disc.
   *
   * On by default, which is every surface that mounted this before the task
   * card's ornament pass (#2031). The card's CTA flank turns it OFF: with the
   * boundary the figure reads as a second boxed seal beside a boxed button,
   * and the design trims it there (`trimMarks()`, `circle[r="47"]`) for exactly
   * that reason. The hub circle is untouched — only the outer ring goes.
   */
  boundary?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Everything is drawn in a 100x100 user space and scaled by `size`. */
const BOX = 100;
const CENTRE = BOX / 2;
/** Outermost petal tip, leaving a hair of margin inside the box. */
const MAX_RADIUS = CENTRE * 0.94;
/** The empty hub the innermost band starts from. */
const HUB_RADIUS = CENTRE * 0.13;
/**
 * Petal fatness: the arc radius as a multiple of the petal's own length. Must
 * exceed 0.5 or the arcs cannot span the chord; larger is slimmer.
 */
const PETAL_CURVE = 0.62;

/**
 * One petal as a symmetric lens (vesica): two arcs of equal radius running
 * base→tip and tip→base, which bulge to opposite sides of the radial spine.
 *
 * A lens, not the brush-tapered petal the vote widget draws — that shape is
 * tuned to be legible at 26-42px as the subject of the surface, while this one
 * is repeated dozens of times at 6-22% and only has to feel woven.
 */
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

/** Per-band tempo, handed to the shared `.ua-mandala-ring` keyframes. */
function bandMotion(band: number): CSSProperties {
  return {
    ["--ua-grow-delay" as string]: `${band * 0.08}s`,
    ["--ua-spin-dur" as string]: `${44 + band * 12}s`,
    ["--ua-spin-dir" as string]: band % 2 === 0 ? "reverse" : "normal",
  };
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
  boundary = true,
  className,
  style,
}: UaMandalaProps) {
  // The third strength. Dense surfaces ask for it and get nothing at all.
  if (strength === "absent") return null;

  const figureOpacity = opacity ?? STRENGTH_OPACITY[strength];
  const bandDepth = (MAX_RADIUS - HUB_RADIUS) / rings;

  const bands: ReactElement[] = [];
  for (let band = 1; band <= rings; band += 1) {
    const inner = HUB_RADIUS + bandDepth * (band - 1);
    const outer = inner + bandDepth;
    // Alternate bands are half a petal out of phase, so the eye reads a weave
    // rather than radial spokes stacked end to end.
    const phase = band % 2 === 0 ? Math.PI / petalsPerRing : 0;
    const petals: ReactElement[] = [];
    for (let index = 0; index < petalsPerRing; index += 1) {
      const angle = (index / petalsPerRing) * Math.PI * 2 + phase;
      petals.push(<path key={index} d={lensPetal(angle, inner, outer)} />);
    }
    bands.push(
      <g
        key={band}
        className={spin ? "ua-mandala-ring" : undefined}
        style={spin ? bandMotion(band) : undefined}
        // Outer bands sit back so the figure has depth rather than one flat weight.
        opacity={1 - (band - 1) * 0.14}
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
