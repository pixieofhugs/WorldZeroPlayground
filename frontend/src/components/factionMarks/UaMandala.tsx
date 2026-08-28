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
 * motion is a reduced-motion-gated class from `src/motion.ornament.css` —
 * `.ua-mandala-ring` for `spin`, `.ua-mandala-pulse` for `pulse` — never an
 * inline `animation:`; this component only hands over per-band tempo. Geometry
 * numbers are raw by design: this is ornament, and ornament does not sit on the
 * type/space scales (§4a).
 */

/** How loudly the pattern speaks on a surface. `absent` draws nothing. */
type UaMandalaStrength = "full" | "texture" | "absent";

/** Default opacity per strength. `texture` sits mid-range of the kit's 6-22%. */
const STRENGTH_OPACITY: Record<UaMandalaStrength, number> = {
  full: 1,
  texture: 0.14,
  absent: 0,
};

interface UaMandalaProps {
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
   * Pop the petals and cycle their hue, band by band on a stagger (#2072).
   *
   * The task card's CTA flanks and nothing else so far. Reduced-motion gated
   * like `spin`, and it degrades to the untouched figure: stilled, the bands
   * keep the resting alpha the pop's own plateau frame interpolates to, and the
   * fill stays whatever `color` is — so there is no state in which the rosette
   * is missing petals or wearing a hue it never reaches in motion.
   *
   * Not combinable with `spin`: both animate `transform` on the same band. See
   * the note in motion.ornament.css.
   */
  pulse?: boolean;
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

/**
 * The band's own alpha: outer bands sit back so the figure has depth rather than
 * one flat weight. ONE expression, because the number is both the `opacity`
 * attribute and (when pulsing) the custom property the pop's plateau frame
 * interpolates to — two copies could drift and a stilled figure would then be a
 * frame the animation never draws.
 */
function bandAlpha(band: number): number {
  return 1 - (band - 1) * 0.14;
}

/**
 * Per-band pulse tempo (#2072), for `.ua-mandala-pulse` in motion.ornament.css.
 *
 * The stagger comes from the band index, not from `nth-child`: the design's
 * `g:nth-child(1…6)` assumes six groups, and this primitive is mounted at three
 * rings on the task card and could be mounted at five. `--ua-hue-delay` is
 * NEGATIVE on purpose — each band opens mid-cycle rather than in lockstep.
 *
 * `--ua-band-alpha` is the pop's plateau. The keyframe interpolates to it rather
 * than to 1 so that popping does not override the `opacity` attribute below and
 * flatten the figure's depth for as long as it runs — and so the rest state and
 * the held frame are the same number by construction. Tenths, again by integer
 * arithmetic: `0.4 + 1.4` is `1.7999999999999998` in floating point.
 */
function bandPulse(band: number): CSSProperties {
  return {
    ["--ua-band-alpha" as string]: `${bandAlpha(band)}`,
    ["--ua-pop-delay" as string]: `${((band - 1) * 8) / 10}s`,
    ["--ua-hue-delay" as string]: `${-(4 + (band - 1) * 14) / 10}s`,
  };
}

/**
 * Which of the hue cycle's three variants a band runs. Hub outward: the first
 * band is the inner cycle, the last is the outer, everything between is the mid
 * — so a mandala at five rings still reads as one figure rather than dropping
 * two bands out of the effect.
 */
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
        // Outer bands sit back so the figure has depth rather than one flat weight.
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
