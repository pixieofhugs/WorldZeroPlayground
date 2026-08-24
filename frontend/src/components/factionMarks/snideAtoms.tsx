/**
 * Shared S.N.I.D.E. craft atoms — the flyposted wall the faction's surfaces
 * stand on, the per-letter ransom cut its names and mastheads are pasted up
 * from, and the pink pen loop it circles a figure in. It does NOT hold the
 * faction's sigil: a struck-through circle-S lived here until #2119 and was a
 * second `SnideSigil` competing with the real one in `components/sigil/`, which
 * two surfaces then imported by mistake. A faction gets one mark, from one
 * module. Mirrors
 * components/factionMarks/ephemeristsPlate.tsx. Colors come from the namespaced
 * --faction-snide-* tokens in index.css. Filter-free (matches the faction's
 * CSS-only craft layers — no SVG feTurbulence).
 */
import type { CSSProperties } from "react";

/**
 * THE BARE WALL — the same ramp with nothing printed on it (#2395, epic #2195).
 *
 * The law, owner 2026-08-17: **a card on an ornamented ground goes plain, a card
 * on a plain ground wears its faction's ornament.** S.N.I.D.E.'s ornament is the
 * four printed layers of {@link WALL} — the xerox raster, the scanline and the
 * two washed corners. The ramp underneath is not ornament, it is the card's
 * GROUND COLOUR, and a card still needs one: dropping the whole recipe would
 * leave a transparent slab on a patterned page rather than a plain one. So
 * "plain" here is the ramp alone, which is also "either burst, or plain" —
 * bare stock, never a substitute texture.
 *
 * NO NEW PAIRING COMES WITH IT. `factionContrast.test.ts` (SNIDE_WALL_PAIRS)
 * measures the `-note-*` inks on all four readings of the wall, and the two ramp
 * stops are two of them; taking the washes off leaves a strict subset.
 */
export const WALL_PLAIN =
  "linear-gradient(180deg, var(--faction-snide-wall) 0%, var(--faction-snide-wall-deep) 100%)";

/**
 * THE FLYPOSTED WALL — S.N.I.D.E.'s one ground (#2177).
 *
 * Five layers bottom-to-top over the `-wall` ramp: the diagonal xerox raster, a
 * vertical scanline, an acid wash off the top-left corner and a pink one off the
 * bottom-right. It FLIPS — xerox stock by day, pitch black by night — which is
 * why every pigment is a token and none of it is a `dark ? a : b` (§8).
 *
 * IT LIVES HERE BECAUSE THREE SURFACES WEAR IT. The recipe was inline in
 * `SnideTaskCard` while the card was its only mount, and the owner's ruling on
 * #2177 gives it to the composer and the praxis card as well. Three inline
 * copies is how a faction acquires a second identity, so it is drawn once, in
 * the shape `covenSlip`'s `SLIP_SHEET` already established for Coven's four
 * mounts. It stays in JS rather than becoming a class for the reason the task
 * card's comment gave: five gradients is a lot of BLOCKING stylesheet.
 *
 * THE INKS THAT GO ON IT ARE THE `-note-*` FAMILY, which flips with it — never
 * `-card-*`, which is pinned near-black in both themes for the slabs pasted ON
 * the wall (#2066). The two ends of that rule are measured against all four of
 * this ground's readings (both ramp stops and both washed corners, both themes)
 * in `utils/__tests__/factionContrast.test.ts`.
 *
 * THAT RULE WAS CHALLENGED AND HELD (#2333). #2269's option 1 proposed
 * collapsing the composer's register onto `-card-*`; the clause is withdrawn.
 * The two families flip differently, and the collapse measures 1.56:1 on
 * `-composer-alarm`.
 */
export const WALL = [
  "repeating-linear-gradient(115deg, var(--faction-snide-note-grain) 0 2px, transparent 2px 7px)",
  "repeating-linear-gradient(0deg, var(--faction-snide-note-scan) 0 1px, transparent 1px 4px)",
  "radial-gradient(120% 80% at 8% -10%, var(--faction-snide-note-wash-acid), transparent 60%)",
  "radial-gradient(90% 70% at 100% 110%, var(--faction-snide-note-wash-pink), transparent 62%)",
  WALL_PLAIN,
].join(", ");

/**
 * The five scraps a name is cut from, and the cut itself (#1198, shared by #2287).
 *
 * Only the first FLIPS — it is a paler patch of the comment sheet's own stock, so
 * on a dark stock it has to be a darker one or the letter loses its edge. The
 * other four are the PRESS's theme-invariant pigments: over-inked black, hot
 * pink, acid. A scrap is a drawn thing.
 *
 * IT MOVED HERE BECAUSE THE FIELD DESK WEARS IT TOO. The recipe was inline in
 * `comments/voices/SnideComment` while the comment byline was its only mount;
 * #2287's ruling gives the S.N.I.D.E. field-desk masthead the same cut, and the
 * faction already keeps two other per-word ransom sets (the task card's `CUTS`,
 * the seal's chips). A third transcription of the per-LETTER one is how a
 * faction acquires a second identity, so it is drawn once, in the shape {@link
 * WALL} and {@link PenCircle} already established for this module.
 *
 * A RANSOM CUT IS GROUND-PORTABLE, and that is the whole reason it could travel
 * without a re-measurement of the mark itself: every letter carries its own
 * OPAQUE scrap, so the pairing is letter-on-scrap and never letter-on-page.
 * Worst reading of the five is the pink tile's `-on-accent` at 5.38:1, in both
 * cascades. The one thing that IS ground-relative is the scrap's own drop, and
 * `--faction-snide-slip-scrap-shadow` flips with the theme, so it survives both
 * grounds the mark now lands on. On the flyposted wall the pale scrap composites
 * at 1.06:1 light / 1.14:1 dark against the wall — it reads as an unpasted patch
 * rather than a tile — but its LETTER still clears the bare wall (15.95:1 light,
 * 17.52:1 dark), so the blend costs a texture and never a word.
 *
 * THE NAME MUST STAY ONE READABLE STRING — see the comment inside.
 */
const RANSOM = [
  {
    bg: "var(--faction-snide-slip-field)",
    col: "var(--faction-snide-slip-ink)",
    font: "var(--faction-snide-font-impact)",
    rot: -5,
  },
  {
    bg: "var(--faction-snide-ink)",
    col: "var(--faction-snide-acid)",
    font: "var(--faction-snide-font-cond)",
    rot: 4,
  },
  {
    bg: "var(--faction-snide-pink)",
    col: "var(--faction-snide-on-accent)",
    font: "var(--faction-snide-font-black)",
    rot: -3,
  },
  {
    bg: "var(--faction-snide-acid)",
    col: "var(--faction-snide-ink)",
    font: "var(--faction-snide-font-impact)",
    rot: 6,
  },
  {
    bg: "var(--faction-snide-ink)",
    col: "var(--faction-snide-paper)",
    font: "var(--faction-snide-font-cond)",
    rot: -6,
  },
];

export function Ransom({ text, size = 16 }: { text: string; size?: string | number }) {
  return (
    // THE NAME MUST STAY ONE READABLE STRING. This is the accessible name of the
    // link (or the heading) it is cut into, and it was an `inline-flex` row of
    // per-letter tiles spaced with `gap`: a flex container discards
    // whitespace-only children, and the space CHARACTER was drawn as an empty
    // box, so the link announced "VexLineCrane" (#1043, the fix #1023 made on
    // the SNIDE task card). Ordinary inline flow instead — REAL spaces between
    // the words, the tiles still `inline-block` and still wrapping, their
    // kerning carried by a margin and the wrapped rows by the line-height.
    <span style={{ display: "inline-block", fontSize: size, lineHeight: 1.25 }}>
      {[...text].map((char, index) => {
        if (char === " ") return <span key={index}>{" "}</span>;
        const s = RANSOM[(char.charCodeAt(0) + index * 3) % RANSOM.length];
        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              verticalAlign: "middle",
              background: s.bg,
              color: s.col,
              fontFamily: s.font,
              fontSize: size,
              lineHeight: 0.92,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of a single cut-out letter tile inside its scrap of paper
              padding: "2px 5px 0",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: kerning between the cut-out ransom letters; a rung breaks the pasted-up letterform run
              marginRight: 2,
              transform: `rotate(${s.rot}deg)`,
              boxShadow: "1.5px 2.5px 0 var(--faction-snide-slip-scrap-shadow)",
              textTransform: "uppercase",
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The pen circle — S.N.I.D.E.'s points mark (#2035, shared by #2042).
 *
 * A figure ringed twice in hot pink biro, struck five degrees off true, with its
 * unit lettered under it inside the loop. Under ADR-0049 a faction's total mark
 * is the device the figure sits INSIDE, and this is S.N.I.D.E.'s: the only DRAWN
 * one it has.
 *
 * IT IS A SHARED MARK, BY OWNER RULING (#2042), ON THREE SURFACES. The task card
 * drew the loop, the praxis-card score stamp drew a bare Anton numeral with a
 * misregistered pink offset shadow, and the TASK DETAIL page drew the loop a third
 * time by hand — one faction, three drawings, and #2042's own survey only ever
 * counted two. The ruling is that the point card reflects the card's total look,
 * so the loop is drawn once, here, and all three surfaces mount it. The pink
 * SHADOW does not come along: the pink is the loop now, and a second pink pass
 * under a pink line reads as mud rather than as misregistration.
 *
 * THE INKS ARE PROPS AND THAT IS NOT OPTIONAL. This is the pairing trap #2042
 * warns about, and S.N.I.D.E. is where it bites hardest — on BOTH the surfaces the
 * loop travelled to. The card's numeral ink is `--faction-snide-note-ink`, which
 * FLIPS (#14110b by day, #f4f1e8 by night), and both other grounds are black in
 * BOTH themes, so it is legible on them in exactly one:
 *
 *   score stamp   `-stamp-bg` over `-card-bg`   `-note-ink` **1.05:1 light**
 *   task detail   `-card-bg`, the punched slab  `-note-ink` **1.00:1 light**
 *
 * 1.00:1 is not a near miss: on the detail page's slab the default figure ink is
 * the identical hex to the ground. The caption default is no better — 3.27:1 on
 * the stamp, 3.12:1 on the slab, both under AA. This is the shape that shipped at
 * 1.08:1 earlier in this epic, and it passes every guard that does not measure the
 * PAIR.
 *
 * So each mount passes its own inks, measured on its own ground:
 *
 *   score stamp (`-stamp-bg` over `-card-bg`)
 *     figure  `--faction-snide-acid`        16.31:1 light · 16.81:1 dark
 *     caption `--faction-snide-card-muted`  13.52:1 light · 12.74:1 dark
 *     loop    `--faction-snide-pink`         5.65:1 light ·  5.82:1 dark
 *   task detail (`-card-bg`, the slab punched into the acid plate — #2066)
 *     figure  `--faction-snide-card-text`   16.68:1 light · 17.51:1 dark
 *     caption `--faction-snide-card-accent` 15.55:1 light · 16.32:1 dark
 *     loop    `--faction-snide-pink`         5.38:1 light ·  5.65:1 dark
 *
 * The loop is theme-invariant and clears 1.4.11's 3:1 on every ground, which is
 * why it alone needs no prop.
 *
 * `valueSize` IS A PROP BECAUSE THE THREE SURFACES DRAW AT DIFFERENT SCALES —
 * the pattern `SingularityReadout`, `DefaultPointsRing` and `UaEnsoScore` already
 * set. The two cards take the default; the detail page's desktop total is the
 * page's headline figure and keeps `--text-display`.
 *
 * NO NUMERAL CEILING, unlike UA's ensō. Anton is condensed enough that the widest
 * total the era can bank still clears the loop: at `--text-heading` a four-glyph
 * `13.6` is ~47px against the loop's ~77px of inner span at the 96 the two cards
 * draw. The detail page asks more of it — `--text-display` on a 128 loop — and
 * that is the ratio the 1.18× growth below was built for, so it is the surface the
 * growth belongs on MOST. If a future era ever banks a five-figure total,
 * `UaEnsoScore.ringCeilingPx` is the upgrade path — ponytail: measured, not
 * machined.
 */
export function PenCircle({
  size,
  value,
  unit,
  valueColor = "var(--faction-snide-note-ink)",
  unitColor = "var(--faction-snide-note-pink-ink)",
  valueSize = "var(--text-heading)",
  unitCaps = false,
  style,
}: {
  /** The loop's drawn width in px. Ornament geometry (§4a). */
  size: number;
  /** The figure inside the loop, already formatted by the caller. */
  value: string | number;
  /** The unit lettered under it. */
  unit: string;
  /** The figure's ink. Defaults to the clipping's own; see the docblock. */
  valueColor?: string;
  /** The caption's ink. Defaults to the clipping's walked pink. */
  unitColor?: string;
  /** The figure's type ramp rung. The two cards take the default. */
  valueSize?: string;
  /**
   * Strike the caption in caps. Off by default, and it is a real per-SITE fact
   * rather than a knob: the task DETAIL shouts its unit, and the score stamp
   * next to it must not — `praxis:card.stamp.pointsShort` is the deliberately
   * lowercase "pts" that #2598's ruling names as an exception, so uppercasing
   * inside this atom would change a surface the ruling protects.
   */
  unitCaps?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: size,
        height: size * 0.78,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-5deg)",
        ...style,
      }}
    >
      {/* THE GROWTH IS ON THE SVG ALONE (#2035), so the numeral and its caption
          stay where they are and the loop opens away from them. A scale on the
          whole mark would grow the type with the line and clear nothing — the
          same move UA's ensō makes. The loop spans 80 of the 100 viewBox units,
          so at 1.18x it reaches 94.4, still inside its own box, which is why
          nothing beside it on either surface has to move. */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 78"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, overflow: "visible", transform: "scale(1.18)" }}
      >
        <g fill="none" stroke="var(--faction-snide-pink)" strokeLinecap="round">
          <path
            d="M14 40 C13 19 38 7 56 9 C79 11 91 24 89 40 C87 59 61 71 43 68 C23 65 12 55 13 37 C13 28 18 19 27 13"
            strokeWidth="2.6"
          />
          <path d="M27 12 C16 18 11 28 11 39" strokeWidth="1.8" opacity="0.75" />
        </g>
      </svg>
      <span
        style={{
          position: "relative",
          fontFamily: "var(--faction-snide-font-impact)",
          fontSize: valueSize,
          lineHeight: 0.9,
          color: valueColor,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      <span
        style={{
          position: "relative",
          fontFamily: "var(--faction-snide-font-impact)",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: pen-circle caption, sized to the drawn loop rather than the label ramp (§4a).
          fontSize: 10,
          letterSpacing: "0.22em",
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the caption's lead inside the drawn loop; a 4px rung pushes it off the numeral.
          marginTop: 2,
          color: unitColor,
          ...(unitCaps ? { textTransform: "uppercase" as const } : {}),
        }}
      >
        {unit}
      </span>
    </div>
  );
}
