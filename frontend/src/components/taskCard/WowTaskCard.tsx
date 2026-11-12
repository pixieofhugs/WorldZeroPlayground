import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { WowBand } from "../cardMasthead/factionBands";
import { WOW_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { BalloonBunch, Bunting, Plaque, Zig } from "../factionMarks/wowOrnament";

/**
 * Warriors of Whimsy — THE QUEST DECREE (#1023): a gold-framed parchment decree,
 * crowned points plaque, wavy rules, bunting under the band, balloon knights
 * flanking the sign-up (#2032). One responsive component (ADR-0056).
 *
 * A quest is ISSUED, proof is RECORDED: do not reconcile with `WowPraxisCard`'s
 * chrome (ADR-0050). NOT the Coven card, whatever the design header says.
 *
 * Gold is never an ink on the cream (2.24:1, §3); the CTA is plum on
 * `--faction-wow-plum-surface` (5.16:1 both themes).
 */

/** Roles read under this surface's own prefix (#2674). */
const MED = "var(--wow-task-card-face)"; /* MedievalSharp */
const LORA = "var(--faction-wow-body-font)"; /* Lora */

const INK = "var(--wow-task-card-ink)";
const MUTED = "var(--wow-task-card-quiet)";
const PLUM = "var(--wow-task-card-accent)";
const GOLD = "var(--faction-wow-chronicle-gold)";
const PLUM_SURFACE = "var(--faction-wow-plum-surface)";
const GILT = "var(--faction-wow-stamp-total)";

interface SizeSet {
  /** Geometry (§4a) on desktop; a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  pad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
  plaque: number;
}

/** Balloon knight width; 1.25x tall = 40 beside a 44px button. One size fits both. */
const KNIGHT = 32;

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    pad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-heading)",
    plaque: 112,
  },
  mobile: {
    cardWidth: "100%",
    pad: "var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-title)",
    pointsSize: "var(--text-title)",
    plaque: 100,
  },
};

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
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          ...factionBodyVars("wow"), ...factionRoleVars("wow", "wow-task-card"),
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--wow-task-card-paper)",
          border: `2px solid ${GOLD}`,
          borderRadius: "var(--wow-task-card-radius)",
          boxShadow: "var(--faction-wow-quest-shadow)",
          color: INK,
        }}
      >
        <WowBand />

        <Bunting />

        <div style={{ padding: size.pad }}>
          {/* Everything but the CTA is the link (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
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
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: MED, fontSize: size.levelSize, lineHeight: 0.85 }}>
                  {task.level_required}
                </span>
              </div>

              <Zig id="hero" style={{ flex: 1, minWidth: 0 }} />

              {/* Faction modifier, hidden at ×1.00 (ADR-0055). */}
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
                  <span style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-lg)", color: MUTED }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              <Plaque minWidth={size.plaque}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: MED,
                      fontSize: size.pointsSize,
                      lineHeight: 0.8,
                      color: GILT,
                      display: "inline-block",
                    }}
                  >
                    {basePoints}
                  </span>
                  {/* Stays flex with one child: block flow's line-height strut
                      would add height the plaque was not drawn with. */}
                </div>
                <div style={{ fontFamily: LORA, fontStyle: "italic", fontSize: "var(--text-md)", color: PLUM, marginTop: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                </div>
              </Plaque>
            </div>

            <h2
              style={{
                fontFamily: MED,
                fontSize: size.titleSize,
                lineHeight: 1.1,
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

          {cta && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: "var(--space-md)",
                marginTop: "var(--space-lg)",
              }}
            >
              {/* Flex siblings, never absolute: they can't land on the 44px
                  target. No bob — forty cards shouldn't run eighty infinite
                  animations; the eyes still wiggle (`.wow-balloon-eye`). */}
              <BalloonBunch size={KNIGHT} bob={false} style={{ transform: "rotate(-6deg)" }} />
              {/* Shared with `WowTaskDetail` (#2642); add nothing here. */}
              <CardCtaControl cta={cta} style={WOW_CARD_CTA}>
                {cta.label}
              </CardCtaControl>
              <BalloonBunch size={KNIGHT} bob={false} style={{ transform: "rotate(-6deg) scaleX(-1)" }} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
