import type { CSSProperties } from "react";

/**
 * Cozy Coven — the candlelit vocabulary, in one place (#1209).
 *
 * Coven had no shared kit module: the spell slip's marks lived inside
 * `CovenTaskCard`, `CovenTaskDetail` and `CovenPraxisDetail`, which was fine
 * while three surfaces wore them. The `coven.exe` sweep dresses THIRTEEN more,
 * and thirteen private copies of a pentagram badge is how a faction acquires a
 * second identity again. So the marks every swept surface needs — and only
 * those — are drawn once here, in the shape `components/duel/wowLists.tsx` and
 * `components/factionMarks/wowMobile.tsx` already established for WOW.
 *
 * NOTHING HERE IS NEW. Every mark is lifted verbatim from the shipped
 * references, and every colour is a `--faction-coven-slip-*` /
 * `--faction-coven-ward-*` token. The design's own `TOKENS` block is raw hex and
 * three of its inks were walked down for AA before shipping — the walked-down
 * value wins, and `index.css` records why at each declaration.
 *
 * ## Which ink goes where — measured, not chosen
 *
 * `INK` / `SOFT` / `LABEL` are the three text tiers and they clear AA on every
 * ground this faction has: the ward page, the ward panel and all four stops of
 * the slip gradient (`utils/__tests__/factionContrast.test.ts`).
 *
 * `DEEP` and `PINK` are NOT in that set. `DEEP` measures 4.44:1 on the ward page
 * — under the floor — and 4.70:1 on the ward panel; `PINK` is 3.07 / 3.25 on the
 * two. So **`PINK` is ornament only** (rings, auras, hearts, bullets) and `DEEP`
 * is a rule, a strand and a large numeral, taking body-sized text only where it
 * sits on `CARD`. When a mark wants a pink that carries words, it wants `INK`.
 *
 * ## What "on `PAGE`" costs, measured under the haze (#1295)
 *
 * The page is not flat: `.coven-candle-backdrop` washes four blooms over it, and
 * an ink laid on the page must clear the darkest one. In LIGHT, under the peak of
 * the pink bloom, `DEEP` falls to **3.47:1** — so the 4.44 above is its BEST
 * reading on that ground, not its worst. The three text inks hold there (INK
 * 5.70, SOFT 4.86, LABEL 4.80), and dark clears everywhere with room.
 *
 * **The substitute is `INK`, not `SOFT`/`LABEL`.** Every consumer this rule
 * caught was a link, an active control or an emphasised clause — an affordance,
 * which must not read QUIETER than the copy around it. `INK` is the strongest of
 * the three (7.29:1 flat, 5.70:1 hazed) and it stays louder than the `LABEL` a
 * trailing crumb or an inactive tab wears. Reach for `SOFT`/`LABEL` when the
 * role really is secondary text; reach for `INK` when `DEEP` was doing a job.
 */

/* The four faces, exactly as the slip and the ward name them. */
export const CHROME = "var(--font-faction-rounded)"; /* Quicksand */
export const READING = "var(--font-faction-serif)"; /* Cormorant Garamond */
export const HAND = "var(--font-faction-script)"; /* Caveat */
export const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch */

/* Ink. See the note above before painting a string in DEEP or PINK. */
export const INK = "var(--faction-coven-slip-ink)";
export const SOFT = "var(--faction-coven-slip-soft)";
export const LABEL = "var(--faction-coven-slip-label)";

/* Ornament and rules. */
export const DEEP = "var(--faction-coven-slip-deep)";
export const PINK = "var(--faction-coven-slip-pk)";
export const GOLD = "var(--faction-coven-slip-gold)";
export const BORDER = "var(--faction-coven-slip-border)";
export const GLOW = "var(--faction-coven-slip-glow)";
export const SHADOW = "var(--faction-coven-slip-shadow)";

/* Grounds. PAGE is the candlelit wash, CARD the paper laid on it. */
export const PAGE = "var(--faction-coven-ward-page)";
export const CARD = "var(--faction-coven-ward-card)";
export const HAIR = "var(--faction-coven-ward-hair)";

/* The call to action, and the gold band that says you already hold this. */
export const CTA_FROM = "var(--faction-coven-slip-cta-from)";
export const CTA_TO = "var(--faction-coven-slip-cta-to)";
export const CTA_INK = "var(--faction-coven-slip-cta-ink)";
export const HOLD_INK = "var(--faction-coven-ward-hold-ink)";

/** The slip itself: pink paper fading to lavender. */
export const SLIP_SHEET =
  "linear-gradient(158deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 36%, var(--faction-coven-slip-lav) 74%, var(--faction-coven-slip-vio))";

/** Small-caps caption voice — every label on the slip speaks in it. */
export const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  fontSize: "var(--text-md)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: LABEL,
};

/** Paper laid on the wash — the panel every block on a Coven surface sits in. */
export const SLIP_PANEL: CSSProperties = {
  background: CARD,
  border: `2px solid ${BORDER}`,
  borderRadius: 16,
  boxSizing: "border-box",
  boxShadow: SHADOW,
};

/** The braided thread rule. `.cvn-braid` owns the strands' pigments (index.css). */
export function Braid({ style }: { style?: CSSProperties }) {
  return <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />;
}

/** The coven's pentagram badge — dashed gold ring, pink field, lit centre. */
export function SigilMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <circle cx="22" cy="22" r="19" fill={PINK} opacity="0.18" />
      <circle cx="22" cy="22" r="15" fill="none" stroke={GOLD} strokeWidth="1" strokeDasharray="2 4" />
      <path
        d="M22 8 L30.2 33.3 L8.7 17.7 L35.3 17.7 L13.8 33.3 Z"
        fill="none"
        stroke={DEEP}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="22" r="3" fill={GOLD} />
    </svg>
  );
}

/** Initials for a name with no uploaded portrait — two letters at most. */
export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

/**
 * One member's disc: a 2px gradient ring round a candle-lit field, the initials
 * set in the reading face inside.
 *
 * TWO KIN TREATMENTS, as the design draws them — pink→deep for a member of the
 * coven, lavender→violet for a `guest`. The list surfaces this sweep dresses
 * (profile body, faction body, field desk) show both.
 */
export function SlipAvatar({
  name,
  size,
  kin = "coven",
}: {
  name: string;
  size: number;
  kin?: "coven" | "guest";
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: size,
        height: size,
        borderRadius: "50%",
        flex: "0 0 auto",
        boxSizing: "border-box",
        // Ring-stroke inset: the padding IS the drawn band (WORLD_ZERO_STYLE §4a).
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the drawn ring's stroke width.
        padding: 2,
        background:
          kin === "guest"
            ? "linear-gradient(150deg, var(--faction-coven-slip-lav), var(--faction-coven-slip-vio))"
            : `linear-gradient(150deg, ${PINK}, ${DEEP})`,
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: CARD,
          fontFamily: READING,
          fontWeight: 600,
          // ornament: the monogram is sized to the disc it is engraved in, not
          // to the type scale (WORLD_ZERO_STYLE §4a). Derived, so the ratchet
          // never sees a literal and no per-line hatch is owed.
          fontSize: Math.round(size * 0.42),
          color: DEEP,
        }}
      >
        {initialsOf(name)}
      </span>
    </span>
  );
}
