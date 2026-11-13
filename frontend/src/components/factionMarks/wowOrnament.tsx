import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { factionRoleVar } from "../../utils/factionRoles";
// The house PRNG — one copy only (see its docstring), so WOW reads it across the
// faction line.
// ponytail: pulls `ephemeristsPlate`'s chunk (~3.5 KB gz) onto WOW ornament surfaces,
// off the critical path. Upgrade: lift `seededRandom` into its own module.
import { seededRandom } from "./ephemeristsPlate";

/**
 * Warriors of Whimsy — the shared ornament vocabulary (#1121), drawn once (§6):
 * {@link Zig} (gold→plum rule), {@link BalloonBunch} (googly balloons),
 * {@link Bunting} (pennants). Siblings: `duel/wowLists.tsx`, `wowMobile.tsx`.
 *
 * Colours are `--faction-wow-*` tokens that flip via the dark cascade, except the
 * gold, which is theme-invariant on purpose (§3: struck metal). Motion is
 * class-gated in `index.css`, never an inline `animation:`. Geometry stays raw px (§4a).
 */

/** Frame + rule gold. Theme-invariant, and never an ink: 2.24:1 on the cream. */
const GOLD = "var(--faction-wow-chronicle-gold)";
/**
 * Plum as INK — flips with the theme. Asked for as a single role because this
 * module is mounted under six roots and has no prefix of its own (#2674); a shared
 * prefix would be the banned `--kit-*` namespace.
 */
const PLUM = factionRoleVar("wow", "accent");
/**
 * Plum as ORNAMENT (#1830): in dark the ink lifts to `#C79BE0` while the shape plum
 * stays `#8A5AAE`. Same swatch by day.
 */
const PLUM_ORNAMENT = "var(--faction-wow-stamp-chip-bg)";

/** The wavy rule's path: a `T`-chained quadratic; `non-scaling-stroke` keeps one weight. */
const ZIG_PATH = (() => {
  let path = "M0,4 Q3,1 6,4";
  for (let x = 12; x <= 120; x += 6) path += ` T${x},4`;
  return path;
})();

/** The points plaque: gold-framed parchment two degrees off true (#3294). */
export function Plaque({
  minWidth,
  style,
  children,
}: {
  minWidth?: number;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        minWidth,
        transform: "rotate(-2deg)",
        background: "var(--faction-wow-chronicle-panel)",
        border: "2px solid var(--faction-wow-chronicle-gold)",
        borderRadius: 6,
        boxShadow: "0 2px 3px var(--faction-wow-stamp-shadow)",
        padding: "var(--space-sm) var(--space-md)",
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * The wavy gold→plum rule. `id` namespaces the document-global SVG gradient id.
 */
export function Zig({ id, style }: { id: string; style?: CSSProperties }) {
  const gradientId = `wow-zig-${id}`;
  return (
    <span aria-hidden="true" style={{ display: "block", minWidth: 24, ...style }}>
      <svg
        width="100%"
        height={8}
        viewBox="0 0 120 8"
        preserveAspectRatio="none"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={GOLD} />
            <stop offset="1" stopColor={PLUM_ORNAMENT} />
          </linearGradient>
        </defs>
        <path
          d={ZIG_PATH}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </span>
  );
}

/** One googly balloon; pupils stagger via `--wow-eye-delay` on `.wow-balloon-eye`. */
export function Balloon({
  cx,
  cy,
  fill,
  delay,
}: {
  cx: number;
  cy: number;
  fill: string;
  delay: number;
}) {
  const eye = (offset: number, eyeDelay: number) => (
    <>
      <circle
        cx={cx + offset}
        cy={cy - 1}
        r={2.4}
        fill="var(--faction-wow-balloon-eye-white)"
        stroke="var(--faction-wow-balloon-eye-ring)"
        strokeWidth={0.8}
      />
      <circle
        className="wow-balloon-eye"
        cx={cx + offset}
        cy={cy - 0.2}
        r={1}
        fill="var(--faction-wow-balloon-eye)"
        style={{ "--wow-eye-delay": `${eyeDelay}s` } as CSSProperties}
      />
    </>
  );
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy}
        rx={9}
        ry={11}
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.2}
      />
      <path
        d={`M${cx - 2},${cy + 10.3} L${cx + 2},${cy + 10.3} L${cx},${cy + 13.3} Z`}
        fill={fill}
        stroke="var(--faction-wow-balloon-outline)"
        strokeWidth={1.1}
        strokeLinejoin="round"
      />
      {eye(-3, delay)}
      {eye(3, delay + 0.3)}
    </g>
  );
}

/**
 * Three balloons on strings. `bob` is the strength dial (§6): a card corner passes
 * `false` — forty cards in a grid shouldn't run forty infinite animations.
 */
export function BalloonBunch({
  size,
  bob = true,
  style,
}: {
  /** Drawn width; the bunch is 1.25× as tall. Geometry, so a raw number. */
  size: number;
  bob?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={bob ? "wow-balloon-bunch" : undefined}
      aria-hidden="true"
      style={{ display: "inline-block", flex: "0 0 auto", width: size, height: size * 1.25, ...style }}
    >
      <svg width={size} height={size * 1.25} viewBox="0 0 44 56" style={{ display: "block" }}>
        <g fill="none" stroke="var(--faction-wow-balloon-string)" strokeWidth={1}>
          <path d="M12,28 Q16,41 22,51" />
          <path d="M31,25 Q28,41 22,51" />
          <path d="M22,36 Q23,44 22,51" />
        </g>
        <Balloon cx={12} cy={15} fill="var(--faction-wow-balloon-5)" delay={0} />
        <Balloon cx={31} cy={12} fill="var(--faction-wow-balloon-5)" delay={0.2} />
        {/* The ornament plum, not `-plum-surface` (frozen at light plum) (#1830). */}
        <Balloon cx={22} cy={27} fill={PLUM_ORNAMENT} delay={0.4} />
        {/* Struck metal: invariant gold, not the theme-moving `-stamp-total` ink. */}
        <circle cx={22} cy={51} r={1.6} fill={GOLD} />
      </svg>
    </span>
  );
}

/**
 * Pennants (#2728): a CSS triangle (7px side borders, 18px top) is 14px wide and a
 * border cannot shrink, so a fixed count under `flex: 1` clipped on narrow windows
 * and stretched into trapezoids on wide ones. The count is MEASURED off the
 * container (as `EphemeristsNotationBand` does) and flags keep their size.
 * Raw px: ornament geometry (§4a); the gap is a number because it's also arithmetic.
 */
const PENNANT_WIDTH = 14;
const PENNANT_GAP = 4;
const PENNANT_HEIGHT = 18;
/** Every other flag hangs 2px lower (a transform, hence the 22px well). */
const PENNANT_STAGGER = 2;

/**
 * Whole pennants for a width. Exported for its test (no DOM in the harness).
 * Unmeasured (0) draws nothing rather than a guess that snaps; the layout effect
 * runs before paint.
 */
export function buntingPennantCount(width: number): number {
  if (!(width > 0)) return 0;
  return Math.floor((width + PENNANT_GAP) / (PENNANT_WIDTH + PENNANT_GAP));
}

/** One flag. Exported: with a measured count, only this can test the alternation. */
export function pennantStyle(index: number): CSSProperties {
  const odd = index % 2 === 1;
  return {
    height: 0,
    borderLeft: `${PENNANT_WIDTH / 2}px solid transparent`,
    borderRight: `${PENNANT_WIDTH / 2}px solid transparent`,
    borderTop: `${PENNANT_HEIGHT}px solid ${odd ? PLUM : GOLD}`,
    transform: `translateY(${odd ? PENNANT_STAGGER : 0}px)`,
  };
}

/** Layout effect measures before paint; `useEffect` is the Node-side fallback. */
const useMeasureEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

/** Gold and plum pennants strung across the head of a page. */
export function Bunting({ style }: { style?: CSSProperties }): ReactNode {
  const strip = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const measure = useCallback(() => {
    const element = strip.current;
    if (!element) return;
    // The content box: mounts add padding (`WowFactionBody`) the flags don't get.
    const box = getComputedStyle(element);
    setWidth(
      element.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight),
    );
  }, []);

  useMeasureEffect(measure);

  useEffect(() => {
    const element = strip.current;
    // Browser global; this module is imported by a Node harness.
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={strip}
      aria-hidden="true"
      // The test handle: a DOM-less harness renders no pennants.
      data-wow-bunting=""
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: PENNANT_GAP,
        // #2728: preflight's border-box let mount padding shrink a fixed height
        // and clip the flag. `content-box` + `min-height` means it only grows.
        boxSizing: "content-box",
        minHeight: PENNANT_HEIGHT + 2 * PENNANT_STAGGER,
        overflow: "hidden",
        opacity: 0.9,
        ...style,
      }}
    >
      {Array.from({ length: buntingPennantCount(width) }, (_, index) => (
        <span key={index} style={pennantStyle(index)} />
      ))}
    </div>
  );
}

/**
 * The banner's scatter — confetti and still balloons (#2727).
 *
 * Replaces a hatch that beat against the backdrop's same-angle hatch; never put a
 * repeating grid back here. Seeded and drawn at module load: per-render or per-visit
 * randomness reads as instability. `wowHeroConfetti.test` checks `Math.random` is
 * absent from this module.
 *
 * Inks are the two washes `index.css` already owns (§3, #1609), already priced for
 * the muster caption's 4.61:1 (#2248), and both flip in dark. Nothing moves: bunches
 * take `bob={false}` and `motion.ornament.css` stills the pupils by class.
 */
export const WOW_CONFETTI_SEED = "wow";

/** Dense enough to read as thrown, sparse enough to stay a watermark. */
const FLAKE_COUNT = 34;

/** Gold first: the plum is the accent in the throw, not half of it. */
const FLAKE_INKS = ["var(--faction-wow-hatch)", "var(--faction-wow-court-glow)"];

/** Ornament strength for the bunches, on the `UaMandala` "texture" rung (§6). */
const BALLOON_WATERMARK = 0.15;

interface WowFlake {
  /** Percent across and down the plate, so the throw reflows with the banner. */
  left: number;
  top: number;
  /** Raw px (§4a). */
  width: number;
  height: number;
  /** Degrees. */
  tilt: number;
  disc: boolean;
  ink: string;
}

/** The throw. Exported for its test: same seed → same scatter. */
export function drawWowConfetti(seed: string): WowFlake[] {
  const next = seededRandom(seed);
  const round = (value: number) => Number(value.toFixed(2));
  return Array.from({ length: FLAKE_COUNT }, () => {
    const disc = next() < 0.24;
    const width = round(4 + next() * 4);
    return {
      left: round(next() * 100),
      top: round(next() * 100),
      width,
      // A rect is 1.4-2.2× as long as wide, so a rotated one reads as paper.
      height: disc ? width : round(width * (1.4 + next() * 0.8)),
      tilt: round(next() * 180 - 90),
      disc,
      ink: FLAKE_INKS[next() < 0.34 ? 1 : 0],
    };
  });
}

const CONFETTI = drawWowConfetti(WOW_CONFETTI_SEED);

/** Hand-placed, not seeded: the type is centred, so balloons keep to the margins. */
const BALLOON_BUNCHES = [
  { left: "3%", top: "9%", size: 62, tilt: -9 },
  { left: "87%", top: "31%", size: 78, tilt: 8 },
  { left: "13%", top: "57%", size: 44, tilt: 6 },
];

/**
 * The banner's ornament layer. No props: there is one scatter and it is WOW's.
 * Needs a positioned ancestor (`WowFactionHero`'s wash layer, pointer-events none).
 */
export function WowBannerScatter(): ReactNode {
  return (
    <span
      className="wow-banner-scatter"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0 }}
    >
      {CONFETTI.map((flake, index) => (
        <span
          key={index}
          style={{
            position: "absolute",
            left: `${flake.left}%`,
            top: `${flake.top}%`,
            width: flake.width,
            height: flake.height,
            borderRadius: flake.disc ? "50%" : 2,
            background: flake.ink,
            transform: `rotate(${flake.tilt}deg)`,
          }}
        />
      ))}
      {BALLOON_BUNCHES.map((bunch) => (
        <BalloonBunch
          key={bunch.left}
          size={bunch.size}
          bob={false}
          style={{
            position: "absolute",
            left: bunch.left,
            top: bunch.top,
            opacity: BALLOON_WATERMARK,
            transform: `rotate(${bunch.tilt}deg)`,
          }}
        />
      ))}
    </span>
  );
}
