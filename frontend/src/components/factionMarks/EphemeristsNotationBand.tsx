import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { BAND_INK, BRASS_RULE, CAPTION, QUIET, READING, seededRandom } from "./ephemeristsPlate";

/**
 * THE NOTATION BAND — the Ephemerists' row of mathematical marks, and since
 * #2230 there is exactly ONE of it.
 *
 * A row of marks, each at its own size, spread `space-between` across whatever
 * width it is given, at a count MEASURED off that width. It is the masthead's
 * last line (`side="band"`, where it is ruled off in brass), it brackets the
 * plate's call to action (`"top"` / `"bottom"`), and it rules the praxis card's
 * byline (`"divider"`). Same drawing at all four; only where it sits differs.
 *
 * ── THE UNIFICATION (#2230), AND WHAT IT GAVE UP ──
 *
 * There were two of these. `EphemeristsNotationBand` measured its width and
 * spread a seeded draw `space-between`; `EphemeristsRuneStrip` marched a fixed
 * sixteen slots at `flex: auto` from its own pool, cramming a page-width row
 * into a card. Owner ruling: *"one component, everywhere. The band's spacing and
 * the strip's fade, in one drawing."* So:
 *
 *  • the band's MEASURED COUNT and `space-between` now govern every mount — a
 *    card draws ~8 marks and a page masthead ~13, at one PITCH rather than one
 *    count;
 *  • the band's POOL is the pool. #1654 let the strip keep its own table on the
 *    grounds that *"two designs drawing one ornament from two tables is not
 *    drift when neither was ever derived from the other"* — a defence that dies
 *    the moment they are one ornament. The strip's formula vocabulary
 *    (`⟨ψ‖Θ‖ψ⟩`, `∂Φ∕∂τ`) goes; the operators below stay;
 *  • the strip's SHIMMER and TURN now play on every mount, so the masthead band
 *    breathes where it used to sit still;
 *  • the strip's 9/10/11px `nth-child` size cycle goes with its stylesheet
 *    rules — the draw carries the size, and it always did.
 *
 * There is no variant, no per-mount special case and no way to ask for the old
 * behaviour: {@link NotationSide} is a vertical-offset knob, a ground, and a
 * seed ingredient, and nothing else.
 *
 * ── THE FADE, INVERTED ──
 *
 * Two animations, both in `motion.ornament.css` behind
 * `prefers-reduced-motion: no-preference`, off the critical path (#2073). The
 * SHIMMER breathes a mark between 0.16 and its own peak; the TURN cross-cuts
 * between the two marks each slot holds, so the row changes over time with no
 * render-time randomness at all — a vote landing or a hover firing re-renders
 * this component and it comes back byte-identical.
 *
 * Note the inversion against the design, and it is the repo's form (`.evm-arc`,
 * `.cvn-wheel`): the base state IS the stilled state — every mark at its own
 * peak, showing its first frame — and both animations are ADDED under
 * `no-preference`. Written the design's way round a reduced-motion reader gets
 * a row at 0.16 and reads nothing. THERE IS NEVER AN INLINE `animation:`: an
 * inline declaration sits outside every media query, so the gate could not
 * exist.
 *
 * ── WHAT LIVES WHERE ──
 *
 *  • THIS FILE owns the pool, the draw, the arithmetic, the box and the inks.
 *    Every colour is a token read through `ephemeristsPlate`; `--epg-op` (peak)
 *    and `--epg-delay` (phase) arrive inline because they are numbers per mark,
 *    which a stylesheet has nowhere to put.
 *  • `index.css` owns the three CTA offsets (`[data-eph-runes="top"]` and its
 *    two siblings — raw lengths off the ramp, which belong in the sheet) and the
 *    RESTING frame of the turn.
 *  • `motion.ornament.css` owns both animations.
 *
 * `aria-hidden`, and it holds no text node assistive technology reaches: the
 * marks are ornament with no reading, and a screen reader spelling out
 * "integral, sum, therefore" between a brief and its sign-up button would be
 * worse than useless.
 */

/**
 * The pool. ~34 marks, all from the mathematical operators the plate's metaphor
 * would plausibly carry — a field journal's working, not a font specimen. The
 * pool's SIZE is the point rather than its membership: at 34 marks a band of 13
 * repeats rarely enough to read as handwriting.
 *
 * It is also the whole vocabulary of the device since #2230. The strip's own
 * table is deleted rather than merged: a union of the two would be 60 marks, the
 * count ceiling below is the pool's length, and a wider pool is not what the
 * unification was for.
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
 *
 * It replaces the strip's 9/10/11 `nth-child` cycle at the CTA mounts (#2230),
 * which is the one visible size change the unification makes: those rows get
 * taller and more varied, which is the same row the masthead has worn since
 * #2143.
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

/** Marks stacked per slot. Two, because two is what it takes for a slot to
 *  change at all and every extra frame is another span per mark — a feed pays
 *  for this ornament three times per card on screen. */
const FRAMES = 2;

/**
 * How many marks a band of this width carries. Exported for its test: this is
 * the one piece of arithmetic here, and it is measured off a real element, so
 * the only place it can be checked without a browser is at the function.
 *
 * An unmeasured band (width 0, before the layout effect runs, or under the
 * SSR-only test harness where effects never run) draws NOTHING rather than the
 * floor — a band that paints seven marks and then jumps to thirteen is the
 * twitch this device exists to remove.
 */
export function markCount(width: number): number {
  if (!(width > 0)) return 0;
  return Math.min(CEILING, Math.max(FLOOR, Math.round(width / PITCH)));
}

export interface NotationMark {
  /** The two marks this slot turns between; `frames[0]` is the resting one. */
  frames: string[];
  /** Raw px — ornament geometry. See {@link MARK_SIZES}. */
  size: number;
  /** Peak opacity, 0.34–0.79 — the design's range, drawn rather than strided. */
  peak: number;
  /** Phase, 0–11.5s, shared by the shimmer and the turn. */
  delay: number;
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
 * PEAK AND PHASE ARE PART OF THE DRAW, which is what "seeded per mark so
 * neighbours do not breathe together" means (#2230): a strided phase would march
 * a wave down the row, and one shared phase would make the whole band pulse as a
 * block. Both are drawn from the same stream as the glyph, so one seed fixes the
 * row AND its motion.
 *
 * It draws the FULL ceiling and the band slices it, rather than drawing `n`.
 * That is what makes a resize add and remove marks at the tail instead of
 * redrawing the whole row: the first mark of a 7-mark band and of a 13-mark band
 * from the same seed are the same mark.
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
 * WHERE THE BAND SITS. It decides three things and nothing else: the vertical
 * offset, the GROUND it is read against (and therefore its ink), and the last
 * ingredient of the seed.
 *
 * `band` is the masthead's own slot, ruled off in brass above and below, on the
 * plate's near-black band. The other three sit on the sheet: `top` / `bottom`
 * bracket a plate CTA, `divider` rules the praxis card's byline, where there is
 * no button to bracket.
 *
 * IT IS ONE PROP RATHER THAN TWO, and that is a deliberate departure from
 * #2230's suggested shape (a `side` plus a `rules` boolean). The brass rules,
 * the band ink and the masthead's own lead are all consequences of ONE fact —
 * this row is on the band, not on the sheet — and a boolean beside `side` would
 * spell that fact twice and admit four combinations that mean nothing. The
 * behaviour is what #2230 asked for: the masthead gets the rules, the CTA mounts
 * pass none and keep their offsets.
 *
 * The value is folded into the seed inside the component, so no mount can forget
 * it and print one row twice — the composer and the praxis card both draw
 * `praxis:${id}`, and only the side keeps them apart.
 */
export type NotationSide = "band" | "top" | "bottom" | "divider";

/** The twin of `SegmentedRail`'s: a layout effect measures before the browser
 *  paints, so the band fills in without a frame of emptiness, and `useEffect` is
 *  the Node-side fallback where there is no layout to read. */
const useMeasureEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

export function EphemeristsNotationBand({ seed, side }: {
  /**
   * Stable per SURFACE — `task:${id}`, `praxis:${id}`. Every distinct value
   * draws a different row, and one value draws the same row forever; see
   * {@link drawNotation}.
   */
  seed: string;
  /** Required, not defaulted: a mount that forgot it would silently share a row
   *  with the mount on the other side of the same button. */
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
    // Guarded as `SegmentedRail` guards its own: the constructor is a browser
    // global and this module is imported by a Node-side harness.
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
        // The device fills its container at every mount, and carries no inset
        // and no bleed of its own — the CONTAINER decides the width.
        //
        // #2724 RETIRED #2312's corner-to-corner rule ("the runes should go
        // from one corner of the box to the other … anywhere there are runes
        // applies"), under which a mount inside a padded box bled ITSELF back
        // out to the border box. The rule now: a rune row is the width of the
        // thing above it, so every `top` / `bottom` / `divider` mount hangs in
        // its surface's own content column — the task card's CTA block is
        // padded, the praxis card's divider sits flush in the leaf, the task
        // page's rows fill the CTA cell and the composer's fills the sheet's
        // column. `side="band"` is unaffected: it already sat inside the
        // masthead's padding and was always correct.
        width: "100%",
        overflow: "hidden",
        fontFamily: READING,
        lineHeight: 1,
        // Ornament geometry: the tallest mark in the cycle, so the row holds its
        // box between the first layout pass and the measured draw and nothing
        // below it reflows.
        minHeight: MARK_SIZES[MARK_SIZES.length - 1],
        // THE GROUND DECIDES THE INK, which is why this is not one paint. The
        // masthead band is `-plate-band` (#12151f, and it does not flip), where
        // `-plate-band-ink` measures 7.59:1; the sheet's own `-plate-quiet` is
        // #3a4257 by day and would be ~1.4:1 on that band. Both are tokens and
        // neither is a theme ternary — the branch is the SURFACE, not the mode.
        color: onBand ? BAND_INK : QUIET,
        ...(onBand
          ? {
              marginTop: "var(--space-xs)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: #2143 opens the datum row's 5px lead to 9px so the two brass rules clear the ascenders and descenders the size cycle throws. Off both neighbouring rungs (8 and 12) and in register with the raw mark sizes below.
              padding: "9px 0",
              // The asymmetry is deliberate: hairline above, heavy rule below,
              // so the band closes the head against the sheet and reads as the
              // masthead's last line rather than the body's first.
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
              // ornament: the 11/13/15/17 optical cycle, which #2143 rules may
              // not be compressed. See MARK_SIZES. A plain comment rather than a
              // directive because the value arrives through `mark.size` — the
              // rule reads literals, and an unused directive fails the lint run.
              fontSize: mark.size,
              /* Every third mark on the SHEET takes the caption gold and the
                 rest the quiet ink the container already sets. The cycle is over
                 the position and not the draw, so the gold stays evenly spread
                 however the marks fall. On the band there is one ink and no
                 accent: `-plate-caption` is a small-caps label colour on the
                 sheet, not a mark colour on the band. */
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
