import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { BalloonBunch, Zig } from "../factionMarks/wowOrnament";

/**
 * Warriors of Whimsy — THE QUEST DECREE (task card v2, #1023).
 *
 * A gold-framed parchment decree under a gold/plum barber ribbon: the level and
 * a crowned points plaque lead, wavy gold→plum rules divide the sections, a
 * sword-and-shield marks the muster, and a bundle of googly balloons is tucked
 * into the bottom corner at a jaunty four degrees. MedievalSharp carries the
 * display; Lora italic carries the quiet register.
 *
 * This replaces "The Royal Decree" (ADR-0055 / ADR-0056) — the same instrument,
 * redrawn. The knobbed rod and the crest seal are gone; the checker band
 * survives as the ribbon, and the decree/chronicle split with `WowPraxisCard`
 * survives with it. A quest is ISSUED, proof is RECORDED; do not reconcile the
 * two chromes (ADR-0050, #899).
 *
 * NOT THE COVEN CARD. The vendored design's header reads "Warrior of Whimsy
 * (Cozy Coven)"; that parenthetical is a stale label of exactly the kind
 * ADR-0050 records, and following one once already gave the chronicle to Coven
 * and invented a yellow skin for WOW out of its spine hue. Gold, plum,
 * MedievalSharp, sword-and-shield and balloons are WOW's. Coven is wave A's
 * pink spell slip.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, and
 * on mobile the balloons drop — the design's own conditional ornament, and the
 * corner they need is the corner a 340px card does not have. There is no mobile
 * twin: ADR-0056 was accepted and the `mobileTaskCard` surface retired, so this
 * file serves both form factors.
 *
 * THE DESIGN'S `ctaGold` A/B PROP IS NOT SHIPPED. It is canvas experimentation
 * rather than part of {@link CardProps}, and the choice it offers is already
 * made: gold measures 2.24:1 on the cream, so nothing legible is ever painted on
 * it (§3). The CTA is plum, on the theme-invariant `--faction-wow-plum-surface`
 * (5.16:1 both themes) rather than the design's dark #8a5aae, which index.css
 * had already measured at 4.10:1 and rejected.
 *
 * The design's one remaining ternary — a four-colour `em` map for the emblem,
 * picked on `theme === 'dark'` — is what a ternary in a skin always is: a token
 * that had not been declared yet. Three of its four roles resolved onto shipped
 * tokens and the fourth became `--faction-wow-quest-blade`.
 */

const MED = "var(--faction-wow-card-font)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const INK = "var(--faction-wow-card-text)";
const MUTED = "var(--faction-wow-card-muted)";
const PLUM = "var(--faction-wow-card-accent)";
const GOLD = "var(--faction-wow-chronicle-gold)";
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const GILT = "var(--faction-wow-stamp-total)";

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  pad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
  /** Minimum width of the crowned plaque. Geometry. */
  plaque: number;
  /** The design's conditional ornament: the corner bundle is desktop-only. */
  balloons: boolean;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    pad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-heading)",
    plaque: 112,
    balloons: true,
  },
  mobile: {
    cardWidth: 340,
    pad: "var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-title)",
    pointsSize: "var(--text-title)",
    plaque: 100,
    balloons: false,
  },
};

/* The decree's label voice (MedievalSharp small caps in plum) lived here. Its one
   reader was the eyebrow carrying the uniform "Task {id}" ordinal, which #1124
   retired, so the voice went with it. */

/** The sword-and-shield that marks the muster. */
function SwordAndShield({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
      <path
        d="M4,5 H16 V11 Q16,16 10,18.5 Q4,16 4,11 Z"
        fill={PLUM_SURFACE}
        stroke={GILT}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <g stroke="var(--faction-wow-quest-blade)" strokeWidth="1.8" strokeLinecap="round">
        <line x1="3.5" y1="16.8" x2="16.5" y2="3.6" />
        <line x1="16.5" y1="16.8" x2="3.5" y2="3.6" />
      </g>
      <g stroke={GILT} strokeWidth="1.4" strokeLinecap="round">
        <line x1="2.5" y1="13.5" x2="6.5" y2="16.5" />
        <line x1="17.5" y1="13.5" x2="13.5" y2="16.5" />
      </g>
      <g fill={GILT}>
        <circle cx="3.2" cy="17.3" r="1.1" />
        <circle cx="16.8" cy="17.3" r="1.1" />
      </g>
    </svg>
  );
}

export default function WowTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
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
          background: "var(--faction-wow-card-bg)",
          border: `2px solid ${GOLD}`,
          borderRadius: 9,
          boxShadow: "var(--faction-wow-quest-shadow)",
          color: INK,
        }}
      >
        {/* The barber ribbon. A 6px stripe carrying NO text, which is what lets
            the undimmed gold/plum ship as drawn (§3, #840). */}
        <div aria-hidden="true" style={{ height: 6, background: "var(--faction-wow-quest-ribbon)" }} />

        <div style={{ padding: size.pad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            {/* The decree-lettered eyebrow held the uniform "Task {id}" ordinal and
              nothing else, so #1124's retirement of the id takes the line with
              it. The barber ribbon above is now the card's top note. */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <span
                  style={{
                    fontFamily: LORA,
                    fontStyle: "italic",
                    fontSize: "var(--text-md)",
                    color: MUTED,
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {i18n.t("feed:taskCard.wow.levelCaption")}
                </span>
                <span style={{ fontFamily: MED, fontSize: size.levelSize, lineHeight: 0.85 }}>
                  {task.level_required}
                </span>
              </div>

              <Zig id="hero" style={{ flex: 1, minWidth: 0 }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: MED,
                      fontSize: "var(--text-lg)",
                      color: "var(--faction-wow-on-plum)",
                      background: PLUM_SURFACE,
                      borderRadius: 4,
                      padding: "var(--space-xs) var(--space-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-xs)", color: MUTED }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* The crowned points plaque, struck two degrees off true. */}
              <div
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  minWidth: size.plaque,
                  transform: "rotate(-2deg)",
                  background: "var(--faction-wow-chronicle-panel)",
                  border: `2px solid ${GOLD}`,
                  borderRadius: 6,
                  boxShadow: "0 2px 3px var(--faction-wow-stamp-shadow)",
                  padding: "var(--space-sm) var(--space-md)",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "var(--space-xs)" }}>
                  <span style={{ fontFamily: MED, fontSize: size.pointsSize, lineHeight: 0.8, color: GILT }}>
                    {basePoints}
                  </span>
                  {/* The ✦ is a dingbat, not text (§4) — which is the only reason
                      it may be painted in the gold, at 2.00:1 on the panel. */}
                  {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the faction glyph, sized to the numeral it trails. */}
                  <span aria-hidden="true" style={{ fontFamily: MED, fontSize: 13, color: GOLD }}>
                    ✦
                  </span>
                </div>
                <div style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-md)", color: PLUM, marginTop: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.wow.pointsUnit")}
                </div>
              </div>
            </div>

            <h3
              style={{
                fontFamily: MED,
                fontWeight: 400,
                fontSize: size.titleSize,
                lineHeight: 1.1,
                margin: "0 0 var(--space-sm)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h3>

            {task.description && (
              <p
                className="card-description"
                style={{
                  fontFamily: LORA,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  color: MUTED,
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            <Zig id="mid" style={{ margin: "0 0 var(--space-md)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <SwordAndShield size={18} />
                <span style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-xl)", color: MUTED }}>
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>

          {onSignup && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-lg)" }}>
              <button
                onClick={() => onSignup(task.id)}
                style={{
                  cursor: "pointer",
                  fontFamily: MED,
                  fontSize: "var(--text-content)",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  padding: "var(--space-sm) var(--space-xl)",
                  borderRadius: 7,
                  color: "var(--faction-wow-on-plum)",
                  background: PLUM_SURFACE,
                  border: `2px solid ${PLUM_SURFACE}`,
                }}
              >
                {i18n.t("feed:taskCard.wow.signup")}
              </button>
            </div>
          )}
        </div>

        {size.balloons && (
          <BalloonBunch
            size={64}
            /* Still, not bobbing: a flex-wrap grid of forty cards is not a place
               to run forty infinite animations. The eyes still wiggle. */
            bob={false}
            style={{ position: "absolute", right: 14, bottom: 10, zIndex: 2, transform: "rotate(4deg)" }}
          />
        )}
      </article>
    </div>
  );
}
