import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { BAND_INK, BRASS_RULE, CAPTION, QUIET, READING, seededRandom } from "./ephemeristsPlate";

/**
 * The notation band — the Ephemerists' one row of mathematical marks (#2230).
 *
 * Seeded marks spread `space-between` at a count measured off the width.
 * Mounts: masthead (`band`, brass-ruled), CTA brackets (`top`/`bottom`),
 * praxis byline (`divider`). Same drawing everywhere; no variants.
 *
 * Motion (shimmer + turn) lives in `motion.ornament.css` behind
 * `prefers-reduced-motion: no-preference` (#2073). Turn period = 2× shimmer
 * (#2725), so every swap lands at zero opacity. The base state is the stilled
 * state (each mark at its peak, first frame); animations are only added under
 * the gate, so never write an inline `animation:` — it would bypass it.
 *
 * Here: pool, draw, arithmetic, box, inks; `--epg-op`/`--epg-delay` are inline
 * per-mark numbers. `index.css`: CTA offsets and the turn's resting frame.
 *
 * `aria-hidden`: ornament with no reading.
 */

/** ~34 marks: enough that a 13-mark band rarely repeats. Sole pool (#2230). */
const MARKS = [
  "∫", "∑", "∏", "√", "∮", "∇", "∂", "≡", "≈", "∝", "∞",
  "⊕", "⊗", "⊙", "⊥", "∠", "∴", "∵", "±", "∓", "×", "÷",
  "⊂", "⊃", "∪", "∩", "∈", "∀", "∃", "∅", "≪", "≫", "∷", "∡",
];

/**
 * Raw px: ornament optical sizes, not the type ramp. The spread may not be
 * compressed (#2143).
 */
const MARK_SIZES = [11, 13, 15, 17];

/** px per mark (owner halved the design's 26, #2143): page ~13, card ~8. */
const PITCH = 52;

/** Floor stops a phone card looking like bullets; ceiling = pool = draw length. */
const FLOOR = 7;
const CEILING = MARKS.length;

/** Two is the minimum for a slot to change; each extra is a span per mark. */
const FRAMES = 2;

/**
 * Unmeasured (width 0, incl. SSR) draws nothing rather than the floor, so the
 * band never jumps from 7 marks to 13.
 */
export function markCount(width: number): number {
  if (!(width > 0)) return 0;
  return Math.min(CEILING, Math.max(FLOOR, Math.round(width / PITCH)));
}

interface NotationMark {
  /** `frames[0]` is the resting one. */
  frames: string[];
  /** Raw px; see {@link MARK_SIZES}. */
  size: number;
  /** Peak opacity, 0.34–0.79. */
  peak: number;
  /** Phase, 0–11.5s, shared by shimmer and turn. */
  delay: number;
}

/**
 * Seeded per surface, never `Math.random()` at render: re-renders and
 * screenshots stay identical. Peak and phase are drawn per mark so neighbours
 * don't pulse together (#2230). Draws the full ceiling so a resize only
 * adds/removes marks at the tail.
 */
export function drawNotation(seed: string): NotationMark[] {
  const next = seededRandom(seed);
  return Array.from({ length: CEILING }, () => ({
    frames: Array.from({ length: FRAMES }, () => MARKS[Math.floor(next() * MARKS.length)]),
    size: MARK_SIZES[Math.floor(next() * MARK_SIZES.length)],
    peak: Number((0.34 + next() * 0.45).toFixed(2)),
    delay: Number((next() * 11.5).toFixed(1)),
  }));
}

/**
 * Decides only offset, ground (hence ink) and a seed ingredient. `band` is on
 * the masthead's dark band; the rest sit on the sheet. One prop, not a
 * `rules` boolean beside it: rules and ink both follow from being on the band.
 * Folded into the seed, since composer and praxis card share `praxis:${id}`.
 */
export type NotationSide = "band" | "top" | "bottom" | "divider";

/** As in `SegmentedRail`: measure before paint; `useEffect` on Node. */
const useMeasureEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

export function EphemeristsNotationBand({ seed, side }: {
  /** Stable per surface — `task:${id}`, `praxis:${id}`. */
  seed: string;
  /** Required: a default would share a row with the other side of a button. */
  side: NotationSide;
}) {
  const band = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const measure = useCallback(() => {
    const element = band.current;
    if (element) setWidth(element.clientWidth);
  }, []);

  useMeasureEffect(measure);

  useEffect(() => {
    const element = band.current;
    // Browser global; Node harness lacks it.
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  const marks = useMemo(() => drawNotation(`${seed}:${side}`), [seed, side]);
  const onBand = side === "band";

  return (
    <div
      ref={band}
      aria-hidden="true"
      data-eph-runes={side}
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        // The container decides the width; no inset or bleed (#2724).
        width: "100%",
        overflow: "hidden",
        fontFamily: READING,
        lineHeight: 1,
        // Tallest mark, so nothing reflows before the measured draw.
        minHeight: MARK_SIZES[MARK_SIZES.length - 1],
        // Ground decides ink: `-plate-quiet` would be ~1.4:1 on the band, where
        // `-plate-band-ink` is 7.59:1. A surface branch, not a theme ternary.
        color: onBand ? BAND_INK : QUIET,
        ...(onBand
          ? {
              marginTop: "var(--space-xs)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: 9px lead lets the brass rules clear the size cycle (#2143)
              padding: "9px 0",
              // Hairline above, heavy below: closes the head against the sheet.
              borderTop: `1px solid ${BRASS_RULE}`,
              borderBottom: `3px double ${BRASS_RULE}`,
            }
          : null),
      }}
    >
      {marks.slice(0, markCount(width)).map((mark, index) => (
        <span
          key={index}
          className="eph-rune"
          style={
            {
              // ornament: see MARK_SIZES. No lint directive: the rule reads
              // literals, and an unused directive fails lint.
              fontSize: mark.size,
              /* On the sheet every third position takes caption gold; the band
                 has one ink and no accent. */
              color: !onBand && index % 3 === 0 ? CAPTION : undefined,
              "--epg-op": mark.peak,
              "--epg-delay": `${mark.delay}s`,
            } as CSSProperties
          }
        >
          {mark.frames.map((frame, at) => (
            <span key={at}>{frame}</span>
          ))}
        </span>
      ))}
    </div>
  );
}

export default EphemeristsNotationBand;
