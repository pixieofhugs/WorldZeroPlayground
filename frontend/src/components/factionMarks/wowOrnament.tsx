import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { factionRoleVar } from "../../utils/factionRoles";

/**
 * Warriors of Whimsy — THE SHARED ORNAMENT VOCABULARY (#1121).
 *
 * WOW's three signature devices, drawn ONCE and consumed everywhere:
 *
 *  - {@link Zig} — the wavy gold→plum rule that divides every WOW section.
 *  - {@link BalloonBunch} — the googly-eyed balloons, on their strings.
 *  - {@link Bunting} — the gold/plum pennants strung across a page head.
 *
 * WORLD_ZERO_STYLE §6 ("A faction's ornament is one primitive at named
 * strengths", #849): a faction's signature device is one parameterized
 * component, never re-drawn per surface — a page with its own hand-tuned
 * balloons and a card with another is how a faction stops looking like one
 * faction. `WowTaskCard` (#1023) and `WowTaskDetail` (#1037) each carried a
 * private copy of the first two; the praxis-detail skin (#1121) would have been
 * the third, so the vocabulary moved here and both older surfaces now import it.
 * The extraction is byte-faithful: the `Zig` path, the balloon geometry and the
 * pennant strip are exactly what those two files drew.
 *
 * Sibling to `components/duel/wowLists.tsx` (the tourney vocabulary) and
 * `components/factionMarks/wowMobile.tsx` (the field-pavilion vocabulary), and named
 * the same way.
 *
 * Every colour is a shipped `--faction-wow-*` token, so all three flip through
 * the `[data-theme="dark"]` cascade with no `dark ?` branch — except the gold,
 * which is theme-INVARIANT on purpose (§3: struck metal does not repaint itself
 * when the lights go out).
 *
 * Motion is CLASS-gated on `prefers-reduced-motion: no-preference`
 * (`.wow-balloon-bunch`, `.wow-balloon-eye` in `index.css`), never an inline
 * `animation:` that would bypass the gate. Stilled, every device still reads.
 *
 * Ornament geometry (`width`/`height`/`viewBox`/`r`/`top`) stays in raw pixels —
 * illustration, not layout (§4a).
 */

/** Frame + rule gold. Theme-invariant, and never an ink: 2.24:1 on the cream. */
const GOLD = "var(--faction-wow-chronicle-gold)";
/**
 * Plum as INK — this one DOES flip with the theme.
 *
 * A ROLE, ASKED FOR DIRECTLY, BECAUSE THIS MODULE HAS NO ROOT (#2674). The
 * surfaces in lane 04 spread `factionRoleVars(slug, '<their own prefix>')` and
 * read `var(--<prefix>-accent, …)` below it. This file is shared vocabulary
 * mounted under six different roots — including `WowTaskDetail`'s and
 * `WowCreateCharacter`'s — so it has no prefix of its own to declare, and one
 * prefix shared between the ornament and its six hosts would BE the `--kit-*`
 * namespace the law declines. `factionRoleVar` is the resolver's answer for a
 * single role with no all-or-nothing seam to protect; it returns the identical
 * string this constant held before.
 */
const PLUM = factionRoleVar("wow", "accent");
/**
 * Plum as ORNAMENT (#1830).
 *
 * The design's skin row splits the two in dark and only in dark: the ink lifts
 * to `#C79BE0` so it can be read, while the plum that is only ever a *shape* —
 * the zigzag's far stop, the odd balloon — stays at `#8A5AAE`, one step off the
 * light value it is theme-invariantly meant to look like. `-stamp-chip-bg`
 * dereferences `-card-accent` in light, so the two are the same swatch by day
 * and it is the night that tells them apart.
 */
const PLUM_ORNAMENT = "var(--faction-wow-stamp-chip-bg)";

/**
 * The wavy rule's path, stretched to whatever its container gives it.
 *
 * Built rather than written out: a `T`-chained quadratic of twenty segments is
 * not a string anyone should maintain by hand, and `vectorEffect:
 * non-scaling-stroke` is what keeps the line one weight however far it stretches.
 */
const ZIG_PATH = (() => {
  let path = "M0,4 Q3,1 6,4";
  for (let x = 12; x <= 120; x += 6) path += ` T${x},4`;
  return path;
})();

/**
 * The wavy gold→plum rule.
 *
 * `id` namespaces the SVG gradient, which is a document-global name: two rules
 * sharing an id both resolve to whichever paints first. They are identical
 * gradients, so a collision is invisible — but each surface still passes its own
 * ids so the markup stays honest.
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

/**
 * One googly balloon on its string. The pupils travel on `.wow-balloon-eye`, the
 * faction's reduced-motion-guarded wiggle, staggered per eye via
 * `--wow-eye-delay` so no two in a bunch move together.
 */
function Balloon({
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
 * The bunch: three balloons and their strings, at a caller-chosen size.
 *
 * `bob` is the strength dial (§6, the UaMandala shape). A bunch that is the
 * page's live ornament BOBS; one tucked into a card corner as a still device
 * does not, because a card in a flex-wrap grid of forty is not a place to run
 * forty infinite animations.
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
        {/* The odd balloon takes the ORNAMENT plum, not the vote plate's first
            ramp rung (`--faction-wow-balloon-1`), which is frozen at the LIGHT
            plum in both themes because the ramp it belongs to is theme-
            invariant. Same swatch by day, the design's lifted `#8A5AAE` by
            night (#1830). */}
        <Balloon cx={22} cy={27} fill={PLUM_ORNAMENT} delay={0.4} />
        {/* The tie-off knot is struck metal, so it takes the theme-invariant
            frame gold rather than the burnt `-stamp-total`, which is an INK
            and moves with the theme (#1830). */}
        <circle cx={22} cy={51} r={1.6} fill={GOLD} />
      </svg>
    </span>
  );
}

/**
 * THE PENNANT, AND WHY THE STRIP COUNTS ITSELF (#2728).
 *
 * A pennant is a CSS triangle: two transparent 7px side borders under an 18px
 * top border. So it is 14px wide, and A BORDER CANNOT SHRINK. The strip used to
 * hang a fixed thirty of them at `flex: 1; min-width: 0` under a comment
 * claiming "they flex, so this is a density, not a width" — which was false in
 * both directions. Below ~536px the flex could not shrink past the mitres and
 * `overflow: hidden` ate the tail (measured on prod: `clientWidth 263 /
 * scrollWidth 536` at a 593px window — half the strip gone). Above it, the flex
 * stretched the zero-height CONTENT box instead, and each flag opened out into a
 * trapezoid with a 33.5px flat top.
 *
 * So the count is MEASURED off the container and every pennant is drawn at its
 * own size — the pattern `EphemeristsNotationBand` already uses (#2143), and
 * deliberately not a second mechanism. The strip carries as many whole flags as
 * fit, at one PITCH rather than one count, and nothing is ever clipped.
 *
 * All four numbers are raw px because all four are ornament geometry (§4a), and
 * the GAP is a number rather than `var(--space-xs)` because it is now arithmetic
 * as well as paint: one constant cannot drift out of step with itself the way a
 * token in the style and a 4 in the maths could.
 */
const PENNANT_WIDTH = 14;
const PENNANT_GAP = 4;
const PENNANT_HEIGHT = 18;
/** Every other flag hangs 2px lower, so the strip reads as string rather than as
 *  a rule. A TRANSFORM, so it paints below the flag's layout box — which is why
 *  the well below is 22 and not 18. */
const PENNANT_STAGGER = 2;

/**
 * How many whole pennants a strip of this width carries. Exported for its test:
 * it is measured off a real element, so a harness with no DOM can only check the
 * arithmetic at the function — and a strip that packs one flag too many looks
 * entirely plausible and is the bug that was reported.
 *
 * An unmeasured strip (width 0, before the layout effect, or under the SSR-only
 * test harness where effects never run) draws NOTHING rather than a guess:
 * `EphemeristsNotationBand`'s rule, for its reason — a strip that paints thirty
 * flags and then snaps to twelve is the twitch the measurement removes. The
 * layout effect runs before paint, so no reader sees the empty state.
 */
export function buntingPennantCount(width: number): number {
  if (!(width > 0)) return 0;
  return Math.floor((width + PENNANT_GAP) / (PENNANT_WIDTH + PENNANT_GAP));
}

/** One flag. Exported for the same reason: with the count measured, the markup a
 *  Node harness sees is an empty strip, so the alternation and the stagger are
 *  only checkable here. */
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

/** The twin of `EphemeristsNotationBand`'s and `SegmentedRail`'s: a layout effect
 *  measures before the browser paints, so the strip fills in without a frame of
 *  emptiness, and `useEffect` is the Node-side fallback where there is no layout
 *  to read. */
const useMeasureEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

/** Gold and plum pennants strung across the head of a page. */
export function Bunting({ style }: { style?: CSSProperties }): ReactNode {
  const strip = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const measure = useCallback(() => {
    const element = strip.current;
    if (!element) return;
    // The CONTENT box, not `clientWidth`, which includes whatever padding the
    // mount added — `WowFactionBody` adds `--space-lg` either side — while the
    // flags only ever get the content box. Counting off `clientWidth` would
    // re-open the horizontal clip on the very mount that reported the other one.
    const box = getComputedStyle(element);
    setWidth(
      element.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight),
    );
  }, []);

  useMeasureEffect(measure);

  useEffect(() => {
    const element = strip.current;
    // Guarded as the band guards its own: the constructor is a browser global
    // and this module is imported by a Node-side harness.
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={strip}
      aria-hidden="true"
      // The strip's handle in the markup. With the count measured there are no
      // pennants for a DOM-less test to find, so this is what a surface test
      // asserts to say "the bunting hangs here, and it is the shared primitive".
      data-wow-bunting=""
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: PENNANT_GAP,
        // THE WELL, AND THE SECOND CLIP (#2728). Tailwind preflight makes
        // everything `border-box`, so a mount passing padding used to shrink the
        // CONTENT box of a fixed `height: 22` — `WowFactionBody` takes 8px off
        // the top, which left 14px for an 18px flag (`clientHeight 22 /
        // scrollHeight 28`). `content-box` keeps the well 22 however a mount
        // spaces it, and `min-height` lets it only ever grow: a mount can no
        // longer clip the ornament it is positioning.
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
