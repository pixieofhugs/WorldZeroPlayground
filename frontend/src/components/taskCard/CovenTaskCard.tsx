import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import CardMasthead from "./CardMasthead";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";

/**
 * Cozy Coven — THE CANDLELIT SPELL SLIP (task card v2, #1023).
 *
 * A slip of paper that fades pink → lavender under a gold twinkle field, headed
 * by a pentagram badge and the coven's name hand-lettered in Caveat. A celtic
 * braid, hearts tied off at both ends, rules off each section; the points sit in
 * a glowing arcane sigil; a slow pentagram watermark turns behind the copy; and
 * the call to action is a full-bleed pink band. Grenze Gotisch carries the
 * title, Cormorant Garamond the reading copy, Quicksand the chrome.
 *
 * This REPLACES the lo-fi `coven.exe` window archetype wholesale (ADR-0055 /
 * ADR-0056 — a full metaphor swap, not a tweak). The `--faction-coven-win-*`
 * tokens stay declared: other surfaces still paint with them.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * All colour via `--faction-coven-slip-*`; light/dark flips through the
 * `[data-theme="dark"]` cascade, never a ternary. Three of the design's inks are
 * walked down for AA against the gradient's darkest stop — see index.css.
 */

const CHROME = "var(--font-faction-rounded)"; /* Quicksand */
const READING = "var(--font-faction-serif)"; /* Cormorant Garamond */
const HAND = "var(--font-faction-script)"; /* Caveat */
const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch */

/**
 * The masthead band the twinkle field is confined to, so no star lands in copy.
 *
 * It was 72px while the wordmark floated over the slip with a braid tied under
 * it. #2029 pins the wordmark into a band of its own and drops the braid, so
 * the field shrinks to the band it dresses. Geometry (§4a).
 */
const MASTHEAD_HEIGHT = 44;

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  /** Outer box of the arcane sigil. Geometry. */
  sigil: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    /* Top pad is the band's now: the floating wordmark used to carry the gap. */
    bodyPad: "var(--space-md) var(--space-xl) var(--space-lg)",
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-heading)",
    sigil: 100,
  },
  mobile: {
    cardWidth: 340,
    bodyPad: "var(--space-md) var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-title)",
    sigil: 88,
  },
};

/** Small-caps caption voice — every label on the slip speaks in it. */
const CAPTION: CSSProperties = {
  fontFamily: CHROME,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--faction-coven-slip-label)",
};

/** A four-point star, centred on (x, y) with arm length r. */
function starPath(x: number, y: number, r: number): string {
  const long = r * 2.6;
  return `M${x} ${y - long} l${r} ${long} ${long} ${r} -${long} ${r} -${r} ${long} -${r} -${long} -${long} -${r} ${long} -${r} z`;
}

/** One heart, tied off at an end of the braid. */
function Heart({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      <path
        d="M6 10.5 C1 7.3, 1.2 3.4, 3.6 2.6 C5 2.1, 5.8 3, 6 3.6 C6.2 3, 7 2.1, 8.4 2.6 C10.8 3.4, 11 7.3, 6 10.5 Z"
        fill="var(--faction-coven-slip-deep)"
      />
    </svg>
  );
}

/** The braid with a heart at each end. `.cvn-braid` owns the thread's pigments. */
function Thread({ style }: { style?: CSSProperties }) {
  return (
    <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: "var(--space-xs)", ...style }}>
      <Heart />
      <span className="cvn-braid" style={{ flex: 1, minWidth: 0 }} />
      <Heart />
    </span>
  );
}

/** The gold twinkle field, clipped to the masthead band. */
function TwinkleField() {
  const stars: [number, number, number][] = [
    [38, 16, 2.6],
    [296, 21, 2],
    [120, 11, 1.4],
    [212, 27, 1.6],
    [264, 10, 1.2],
    [74, 29, 1.6],
  ];
  return (
    <svg
      width="100%"
      height={MASTHEAD_HEIGHT}
      viewBox={`0 0 340 ${MASTHEAD_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: 0, right: 0, zIndex: 1, pointerEvents: "none" }}
    >
      {stars.map(([x, y, r]) => (
        <path key={`${x}-${y}`} d={starPath(x, y, r)} fill="var(--faction-coven-slip-gold)" opacity={0.8} />
      ))}
    </svg>
  );
}

/** The points, held in a glowing arcane sigil. */
function Sigil({ size, points }: { size: number; points: number }) {
  const sparkles: [number, number, number][] = [
    [50, 4, 3.4],
    [88, 26, 2.4],
    [14, 74, 2.8],
    [84, 78, 1.9],
    [16, 24, 1.7],
  ];
  return (
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--faction-coven-slip-sigil-halo)" }}
      />
      <span
        aria-hidden="true"
        style={{ position: "absolute", inset: "18%", borderRadius: "50%", background: "var(--faction-coven-slip-sigil-core)" }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <circle cx="50" cy="50" r="32" fill="none" stroke="var(--faction-coven-slip-pk)" strokeWidth="1.6" opacity="0.9" />
        <g stroke="var(--faction-coven-slip-gold)" strokeWidth="1.1" strokeLinecap="round" opacity="0.8">
          <path d="M50 8 v6" />
          <path d="M50 86 v6" />
          <path d="M8 50 h6" />
          <path d="M86 50 h6" />
        </g>
        {sparkles.map(([x, y, r]) => (
          <path key={`${x}-${y}`} d={starPath(x, y, r)} fill="var(--faction-coven-slip-gold)" opacity={0.9} />
        ))}
      </svg>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 0.85,
        }}
      >
        <span
          className="content-title"
          style={{ fontFamily: READING, fontWeight: 600, color: "var(--faction-coven-slip-deep)" }}
        >
          {points}
        </span>
        {/* Ornament: the unit caption inside the drawn sigil, sized to the disc
            rather than to the label ramp (WORLD_ZERO_STYLE §4a). */}
        {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption engraved inside the sigil. */}
        <span style={{ ...CAPTION, fontSize: 8, marginTop: "var(--space-xs)" }}>
          {i18n.t("feed:taskCard.pointsUnit")}
        </span>
      </div>
    </div>
  );
}

export default function CovenTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background:
            "linear-gradient(158deg, var(--faction-coven-slip-from), var(--faction-coven-slip-mid) 36%, var(--faction-coven-slip-lav) 74%, var(--faction-coven-slip-vio))",
          border: "2px solid var(--faction-coven-slip-border)",
          borderRadius: 18,
          boxShadow: "var(--faction-coven-slip-shadow)",
          color: "var(--faction-coven-slip-ink)",
          fontFamily: CHROME,
        }}
      >
        {/* The turning pentagram watermark. `.cvn-wheel` owns the motion and its
            reduced-motion guard (#911 — no component-injected <style>). */}
        <svg
          className="cvn-wheel"
          width={420}
          height={420}
          viewBox="0 0 100 100"
          aria-hidden="true"
          style={{ position: "absolute", right: -118, bottom: -64, zIndex: 0, pointerEvents: "none", opacity: 0.09 }}
        >
          <path
            d="M50 12 L73.5 84.3 L11.9 39.7 L88.1 39.7 L26.5 84.3 Z"
            fill="none"
            stroke="var(--faction-coven-slip-deep)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>

        {/* Masthead. THE WORDMARK MOVES (#2029): it floated over the slip under
            a pentagram badge, with a braid tied off beneath it; v3 pins it into
            a band at the top of the card on the kit's shared anatomy — the mark
            hard left, the hand-lettered name centred on the band.

            Two things go with the move. The badge is retired in favour of the
            kit's own `CovenSigil`, because a card may not draw two faction
            marks in its header; and the braid under the wordmark goes, because
            a band that already names the coven does not need an ornament run
            repeating it. Both marks live on elsewhere on the slip — the braid
            rules off every section below, and the pentagram still turns as the
            watermark.

            The twinkle field moves INTO the band, over its ground: with a
            painted band the stars would otherwise be hidden behind it. */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: MASTHEAD_HEIGHT,
            background: "var(--faction-coven-slip-sigil-ground)",
            borderBottom: "1px solid var(--faction-coven-slip-pk)",
          }}
        >
          <TwinkleField />
          <CardMasthead slug="coven" style={{ height: "100%" }}>
            {/* The slip's own `feed:taskCard.coven.masthead` held a second copy
                of the faction's name ("the cozy coven") and is gone with #1910.
                The lower case belonged to the hand-lettering rather than to the
                word, so it lives in `textTransform`, where casing belongs — the
                name itself comes from the one place that owns it (ADR-0038). */}
            <div style={{ fontFamily: HAND, fontSize: "var(--text-title)", lineHeight: 1, textTransform: "lowercase" }}>
              {factionName("coven")}
            </div>
          </CardMasthead>
        </div>

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            {/* The slip's pencilled ordinal ("Task {id}", hand-lettered under the
                masthead) is gone with #1124 — the id no longer shows on any card,
                and it was the whole line. */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-xs)" }}>
                <span style={{ fontFamily: READING, fontWeight: 600, fontSize: size.levelSize, lineHeight: 0.8 }}>
                  {task.level_required}
                </span>
                {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption set to the numeral beside it, not the label ramp. */}
                <span style={{ ...CAPTION, fontSize: 8.5 }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
              </div>

              <Thread style={{ flex: 1, minWidth: 0 }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: CHROME,
                      fontWeight: 700,
                      fontSize: "var(--text-md)",
                      lineHeight: 1,
                      color: "var(--faction-coven-slip-cta-ink)",
                      background:
                        "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))",
                      border: "1.5px solid var(--faction-coven-slip-cta-to)",
                      borderRadius: 20,
                      padding: "var(--space-xs) var(--space-sm)",
                      boxShadow: "0 3px 8px var(--faction-coven-slip-glow)",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption tucked under the chip. */}
                  <span style={{ ...CAPTION, fontSize: 7.5 }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              <Sigil size={size.sigil} points={basePoints} />
            </div>

            <h2
              style={{
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: size.titleSize,
                lineHeight: 1.06,
                letterSpacing: "0.005em",
                margin: "0 0 var(--space-sm)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h2>

            {task.description && (
              <p
                className="card-description"
                style={{
                  fontFamily: READING,
                  fontStyle: "italic",
                  lineHeight: 1.45,
                  color: "var(--faction-coven-slip-soft)",
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            <Thread style={{ margin: "0 0 var(--space-sm)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <svg width={15} height={15} viewBox="0 0 36 36" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path
                    d="M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z"
                    fill="var(--faction-coven-slip-pk)"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: READING,
                    fontStyle: "italic",
                    fontSize: "var(--text-xl)",
                    color: "var(--faction-coven-slip-soft)",
                  }}
                >
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>
        </div>

        {cta && (
          <button
            type="button"
            onClick={cta.onPress}
            aria-disabled={cta.denied || undefined}
            style={{
              position: "relative",
              zIndex: 2,
              cursor: cta.denied ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-sm)",
              width: "100%",
              background:
                "linear-gradient(180deg, var(--faction-coven-slip-cta-from), var(--faction-coven-slip-cta-to))",
              color: "var(--faction-coven-slip-cta-ink)",
              fontFamily: CHROME,
              fontWeight: 700,
              fontSize: "var(--text-lg)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "var(--space-md) 0",
              border: "none",
              borderTop: "1.5px solid var(--faction-coven-slip-cta-to)",
            }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
              <path
                d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
                fill="currentColor"
              />
            </svg>
            {cta.label}
          </button>
        )}
      </article>
    </div>
  );
}
