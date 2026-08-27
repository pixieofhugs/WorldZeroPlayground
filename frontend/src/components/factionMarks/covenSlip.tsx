import type { CSSProperties } from "react";

import { mediaUrl } from "../../utils/media";

/**
 * Cozy Coven — the candlelit vocabulary, in one place (#1209).
 *
 * Coven had no shared kit module: the spell slip's marks lived inside
 * `CovenTaskCard`, `CovenTaskDetail` and `CovenPraxisDetail`, which was fine
 * while three surfaces wore them. The `coven.exe` sweep dresses THIRTEEN more,
 * and thirteen private copies of a faction's badge is how a faction acquires a
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
 * WHERE THAT GROUND STILL IS, after #2135: the mobile field desk, and nothing
 * else. Both detail columns wore it and now wear `SLIP_SHEET`; the substitution
 * rule below is unchanged, but the surfaces it governs are the field desk's.
 * `DEEP` is worse on the SHEET than it was on the hazed page — 3.33:1 on the
 * gradient's darkest stop in light — so "when a mark wants a pink that carries
 * words, it wants `INK`" now holds on four surfaces rather than two.
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

/**
 * The slip itself: pink paper fading to lavender.
 *
 * FOUR SURFACES WEAR IT (#2135): the task card, the praxis card and both detail
 * columns. It is the faction's ground, not one card's — the three inks measured
 * on it in `factionContrast.test.ts` are measured for all four, and `DEEP` is
 * ornament on every one of them (3.33:1 on the darkest stop in light).
 */
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

/* SLIP_PANEL — "paper laid on the wash" — is RETIRED (#2325). It was the ward
   family's `CARD` boxed up for a slip surface to lay on itself, and its last
   reader was the faction-directory tile's status chip, which had no answer in
   the task card's register to gather from. Every other Coven surface that wants
   ward paper already reaches for `CARD` directly and draws its own edge; a
   preset with one caller was the thing keeping a second surface's ground alive
   on this one. `CARD`, `BORDER` and `SHADOW` are unaffected and keep their
   readers. */

/** The braided thread rule. `.cvn-braid` owns the strands' pigments (index.css). */
export function Braid({ style }: { style?: CSSProperties }) {
  return <span aria-hidden className="cvn-braid" style={{ minWidth: 20, ...style }} />;
}

/**
 * The four-point twinkle — the coven's ORNAMENT glyph, not its badge.
 *
 * It lived in `components/sigil/CovenSigil.tsx` until Sigil Studies v2 gave the
 * faction's sigil the witch hat. The drawing is unchanged to the byte; only its
 * address moved, and it moved HERE because every one of its nine mounts is a
 * swept-surface ornament rather than a mark of identity — a bullet before button
 * text, the glyph beside a stat numeral, eight at a time drifting across the
 * profile band's scatter field — which is exactly the set this module was
 * created to hold once (#1209).
 *
 * `color` keeps `--faction-coven` as its default so a mount that passes nothing
 * is byte-identical; in practice all nine pass `GOLD` or `CTA_INK`.
 */
export function Spark({
  size = 22,
  color = "var(--faction-coven)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z" fill={color} />
    </svg>
  );
}

/* THE PENTAGRAM BADGE IS GONE FROM THIS MODULE (#2726). `SigilMark` — a pink
   disc under a dashed gold ring, a five-point star, a lit centre — stood here
   and had six mounts: the faction hero, the faction body's join band, the task
   detail header, the duel seal band, the create-character masthead and the
   mobile field desk's plate. All six now draw `components/sigil/CovenSigil`,
   the witch hat, which is what `CovenAvatar` badges a member with (#2217) and
   what the directory tile dispatches to (#2325). A player meets ONE symbol for
   this faction.

   `PINK`, `GOLD` and `DEEP` stay exported: the badge was one consumer of three
   inks this module publishes for the whole kit, not their reason to exist. */

/**
 * The turning watermark — A CAT, line-drawn, replacing the pentagram (#2041).
 *
 * The pentacle was the corner watermark on FIVE surfaces (the task card, the
 * character profile, both detail pages and the praxis composer), and each of
 * them held its own copy of the same path. That is the duplication this module
 * exists to end, and it is why the swap lands here rather than five times over:
 * a watermark a player meets on two pages they move between may not be two
 * different drawings (#2041 ruling 1, applied to the real mount list — the
 * issue names two mounts and there are five).
 *
 * The drawing is the design's own, lifted verbatim from `TaskCards.dc.html`'s
 * `DCLogic` — head, ears, eyes, muzzle, whiskers, each an open stroke with a
 * round cap. Nothing is filled: at watermark strength a filled shape is a
 * smudge, and the cat has to survive being 9% present.
 *
 * ## Placement is the mount's, and the reason is the design's
 *
 * "A face can't bleed off the card the way the pentacle did." A pentagram is
 * radially symmetric and abstract, so a cropped one still reads as itself; a
 * half-cropped face reads as a mistake. So every mount now sits the mark FULLY
 * INSIDE its container, where four of the five used to hang a third of the
 * drawing off the right edge. Nothing here pins that — the mount passes `size`
 * and the offsets, because a card, a profile band, a detail sheet and a
 * composer are four different scales.
 *
 * The one thing that may leave the frame is a whisker tip: the outermost is at
 * x=97 of a 100-unit box, i.e. 3% in, so a mount with a small negative `right`
 * grazes the cap and nothing else. The head sits at x∈[20,80] and cannot reach
 * an edge before the whiskers do.
 *
 * ## `.cvn-wheel` is untouched, and that is the whole motion story
 *
 * The class, its `transform-origin`, the `@keyframes cvn-wheel` and the
 * `prefers-reduced-motion: no-preference` gate around them are index.css's and
 * are unchanged (#911 — no component-injected `<style>`). The cat turns once
 * every two minutes where motion is welcome and is simply drawn, still, where
 * it is not. Owner: "it's silly but it's cute."
 *
 * ## Opacity is the MOUNT's, and it is a contrast decision (#1302)
 *
 * `DEEP` is the sheet's own hue, so a wash of it under the copy can only
 * tighten the reading. Measured with `utils/contrast.ts` against the two
 * gradient stops the corner of the slip actually runs (`-slip-lav` 74%,
 * `-slip-vio` 100%), for `--faction-coven-slip-soft`, the brief's ink:
 *
 *   alpha   light lav / vio      dark lav / vio
 *   0.09    4.68 / 4.51          5.10 / 5.38     ← what every mount ships
 *   0.13    4.44 / 4.28          4.65 / 4.91
 *   0.15    4.33 / 4.17          4.44 / 4.68
 *
 * 0.09 is the last step that keeps the brief clear of AA on both stops in both
 * cascades, which is why no mount raises it: the design's 0.15 buys a louder
 * ornament with 0.33 of a body ink's margin, and Coven has already made this
 * call once — the ward's gold bloom is mixed to 55% for the same reason
 * (see `--faction-coven-ward-haze` in index.css). The title ink clears either
 * way (5.07 / 4.89 light at 0.15).
 */
export function CovenCat({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <svg
      className="cvn-wheel"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ position: "absolute", zIndex: 0, pointerEvents: "none", ...style }}
    >
      {CAT.map(([d, width]) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={DEEP}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/** `[path, stroke-width]`, in draw order. See {@link CovenCat}. */
const CAT: ReadonlyArray<readonly [string, number]> = [
  ["M50 24 C68 24 80 37 80 52 C80 70 66 82 50 82 C34 82 20 70 20 52 C20 37 32 24 50 24 Z", 2.2],
  ["M28 31 L25 10 L44 23", 1.9],
  ["M72 31 L75 10 L56 23", 1.9],
  ["M38 47 L38 55", 1.9],
  ["M62 47 L62 55", 1.9],
  ["M50 60 L46 64 M50 60 L54 64 M50 60 L50 67", 1.9],
  ["M21 57 L3 52 M21 63 L3 67 M79 57 L97 52 M79 63 L97 67", 1.9],
];

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

/** A portrait filling a medallion's field, cropped square-to-circle. */
const PORTRAIT: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
};

/**
 * One member's disc: a 2px gradient ring round a candle-lit field, the initials
 * set in the reading face inside.
 *
 * TWO KIN TREATMENTS, as the design draws them — pink→deep for a member of the
 * coven, lavender→violet for a `guest`. The list surfaces this sweep dresses
 * (profile body, faction body, field desk) show both.
 *
 * THE MONOGRAM IS THE FALLBACK, NOT THE DEFAULT (#2226). The portrait replaces
 * the inner field, so the gradient ring — which is the OUTER span's background
 * showing through its 2px padding — dresses the photo unchanged.
 */
export function SlipAvatar({
  name,
  size,
  kin = "coven",
  avatarUrl,
}: {
  name: string;
  size: number;
  kin?: "coven" | "guest";
  /** The member's portrait. Empty/absent falls back to the monogram. */
  avatarUrl?: string | null;
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
      {avatarUrl ? (
        <img alt="" src={mediaUrl(avatarUrl)} style={PORTRAIT} />
      ) : (
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
      )}
    </span>
  );
}
