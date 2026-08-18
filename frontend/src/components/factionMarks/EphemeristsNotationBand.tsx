import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BAND_INK, BRASS_RULE, READING, seededRandom } from "./ephemeristsPlate";

/**
 * THE NOTATION BAND (#2143) — the masthead's last line, and the datum row's
 * replacement.
 *
 * A row of mathematical marks, each at its own size, ruled off by a `1px` brass
 * hairline above and a `3px double` brass rule below. It inherits those rules
 * from the datum row it replaces; what it does NOT inherit is the datum row's
 * `5px` lead, which opens to `9px` so the rules sit clear of the ascenders and
 * descenders the varied sizes throw. The asymmetry — hairline above, heavy rule
 * below — is deliberate: the heavy rule closes the head against the sheet, so
 * the band reads as the masthead's last line rather than the body's first.
 *
 * THE MARKS ARE ON THE BAND, so their ink is {@link BAND_INK} — the same
 * `-plate-band-ink` the wordmark takes, measured 7.59:1 on the compass blue in
 * BOTH cascades (#2140/#2141). The rules take `-plate-brass-rule`, the faction's
 * one line brass, 3.73:1 on that blue. Neither flips with the theme, because the
 * band does not.
 *
 * `aria-hidden`, and it holds no text node assistive technology reaches: the
 * marks are ornament with no reading, and a screen reader spelling out
 * "integral, sum, therefore" across every Ephemerists surface would be noise.
 */

/**
 * The pool. ~34 marks, all from the mathematical operators the plate's metaphor
 * would plausibly carry — a field journal's working, not a font specimen. The
 * pool's SIZE is the point rather than its membership: at 34 marks a band of 13
 * repeats rarely enough to read as handwriting.
 */
const MARKS = [
  "∫", "∑", "∏", "√", "∮", "∇", "∂", "≡", "≈", "∝", "∞",
  "⊕", "⊗", "⊙", "⊥", "∠", "∴", "∵", "±", "∓", "×", "÷",
  "⊂", "⊃", "∪", "∩", "∈", "∀", "∃", "∅", "≪", "≫", "∷", "∡",
];

/**
 * The size cycle, in raw pixels, and it stays four steps wide.
 *
 * Ornament type (WORLD_ZERO_STYLE, "the ornament escape hatch"): these are the
 * optical sizes of a drawn mark, not a tier of the type ramp — 11 happens to sit
 * on `--text-md` and still is not label-tier text. The SPREAD is what makes the
 * row read as a hand rather than as a font sample, so #2143 rules it may not be
 * compressed to four adjacent sizes.
 */
const MARK_SIZES = [11, 13, 15, 17];

/**
 * One mark's share of the row, in px. The design drew 26; the owner HALVED the
 * density to 52 (#2143), which lands a page masthead near 13 marks and a card
 * near 8 — the SPACING constant across the scales, and the count varying.
 */
const PITCH = 52;

/** The floor keeps a 260px phone card from spreading five marks into a row of
 *  bullets; the ceiling is the pool's own size, and also the length of the draw
 *  below, so no band ever runs out of marks. */
const FLOOR = 7;
const CEILING = MARKS.length;

/**
 * How many marks a band of this width carries. Exported for its test: this is
 * the one piece of arithmetic here, and it is measured off a real element, so
 * the only place it can be checked without a browser is at the function.
 *
 * An unmeasured band (width 0, before the layout effect runs, or under the
 * SSR-only test harness where effects never run) draws NOTHING rather than the
 * floor — a band that paints seven marks and then jumps to thirteen is the
 * twitch this issue exists to remove.
 */
export function markCount(width: number): number {
  if (!(width > 0)) return 0;
  return Math.min(CEILING, Math.max(FLOOR, Math.round(width / PITCH)));
}

export interface NotationMark {
  glyph: string;
  /** Raw px — ornament geometry. See {@link MARK_SIZES}. */
  size: number;
}

/**
 * The draw, seeded from something stable about the SURFACE — a task or praxis
 * id, never `Math.random()` at render.
 *
 * Two things follow from the seed, and both are the reason for it. A band that
 * redrew itself every render would twitch whenever anything unrelated moved on
 * the page — a vote lands, a filter changes, a hover fires — and a screenshot of
 * it would never reproduce, which is exactly what this epic's visual QA needs.
 *
 * It draws the FULL ceiling and the band slices it, rather than drawing `n`.
 * That is what makes a resize add and remove marks at the tail instead of
 * redrawing the whole row: the first mark of a 7-mark band and of a 13-mark band
 * from the same seed are the same mark.
 */
export function drawNotation(seed: string): NotationMark[] {
  const next = seededRandom(seed);
  return Array.from({ length: CEILING }, () => ({
    glyph: MARKS[Math.floor(next() * MARKS.length)],
    size: MARK_SIZES[Math.floor(next() * MARK_SIZES.length)],
  }));
}

/** The twin of `SegmentedRail`'s: a layout effect measures before the browser
 *  paints, so the band fills in without a frame of emptiness, and `useEffect` is
 *  the Node-side fallback where there is no layout to read. */
const useMeasureEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

export function EphemeristsNotationBand({ seed }: {
  /**
   * Stable per SURFACE. Every distinct value draws a different row, and one
   * value draws the same row forever — see {@link drawNotation}.
   */
  seed: string;
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
    // Guarded as `SegmentedRail` guards its own: the constructor is a browser
    // global and this module is imported by a Node-side harness.
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  const marks = useMemo(() => drawNotation(seed), [seed]);

  return (
    <div
      ref={band}
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginTop: "var(--space-xs)",
        // eslint-disable-next-line local/no-raw-style-values -- ornament: #2143 opens the datum row's 5px lead to 9px so the two brass rules clear the ascenders and descenders the size cycle throws. Off both neighbouring rungs (8 and 12) and in register with the raw mark sizes below.
        padding: "9px 0",
        borderTop: `1px solid ${BRASS_RULE}`,
        borderBottom: `3px double ${BRASS_RULE}`,
        fontFamily: READING,
        color: BAND_INK,
        lineHeight: 1,
        // Ornament geometry: the tallest mark in the cycle, so the band holds
        // its box between the first layout pass and the measured draw and the
        // masthead below it never reflows.
        minHeight: MARK_SIZES[MARK_SIZES.length - 1],
        overflow: "hidden",
      }}
    >
      {marks.slice(0, markCount(width)).map((mark, index) => (
        <span
          key={index}
          // ornament: the 11/13/15/17 optical cycle, which #2143 rules may not
          // be compressed. See MARK_SIZES. A plain comment rather than a
          // directive because the value arrives through `mark.size` — the rule
          // reads literals, and an unused directive fails the lint run.
          style={{ fontSize: mark.size }}
        >
          {mark.glyph}
        </span>
      ))}
    </div>
  );
}

export default EphemeristsNotationBand;
