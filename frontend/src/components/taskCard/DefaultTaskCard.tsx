import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { DEFAULT_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import {
  factionSpectrumSheet,
} from "../../utils/factions";
import { factionRoleVars } from "../../utils/factionRoles";
import DefaultPointsRing from "../factionMarks/DefaultPointsRing";

/**
 * DefaultTaskCard — the spectrum sheet: the `na` (unaffiliated) kit's task card
 * and the fallback for factions without one. Lora italic title, Courier Prime
 * the rest. One responsive component (ADR-0056); colour via the role map (#2672).
 */

const MONO = "var(--font-body)";
/**
 * Deliberately NOT `--faction-default-card-font` (the praxis card's face). To
 * unify na's display face, repoint that token in index.css; don't branch here.
 */
const LORA = "var(--font-display)";

interface SizeSet {
  /** Raw px on desktop (WORLD_ZERO_STYLE §4a); a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  /** Outer diameter of the conic points ring. */
  ringSize: number;
  pad: string;
  titleSize: string;
  numeralSize: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    ringSize: 92,
    pad: "var(--space-xl)",
    titleSize: "var(--text-title)",
    numeralSize: "var(--text-heading)",
  },
  mobile: {
    cardWidth: "100%",
    ringSize: 80,
    pad: "var(--space-lg)",
    titleSize: "var(--text-content)",
    numeralSize: "var(--text-title)",
  },
};

/** Label-tier caption voice shared by every small mark on the sheet. */
const CAPTION: CSSProperties = {
  fontFamily: MONO,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--na-task-card-quiet)",
};

export default function DefaultTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  const showMultiplier = !isNeutralMultiplier(multiplier);
  const cta = taskCardSignupCta(task, onSignup);

  return (
    <div
      data-form-factor={formFactor}
      style={{ width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          // Pinned to na, not `task.primary_faction_slug`: the ground is na's
          // spectrum and an ink may not leave a ground that stays put (#2361).
          // The prefix lets a host dress THIS surface instead of overriding
          // `--faction-default-card-text` for every na descendant.
          ...factionRoleVars("na", "na-task-card"),
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          // The spectrum IS the border (transparent 3px frame); only the
          // geometry is this card's, the ramp is `factionSpectrumSheet()`'s.
          border: "3px solid transparent",
          borderRadius: 14,
          ...factionSpectrumSheet(),
          boxShadow: "0 12px 32px -14px var(--color-cast-shadow)",
          color: "var(--na-task-card-ink)",
          fontFamily: MONO,
          padding: size.pad,
        }}
      >
        {/* Card-sized link around all but the CTA (no <button> in an <a>).
            `data-card-link` marks the anchor the equal-height row hands spare
            height to (`.task-card-row` in index.css, #2380). */}
        <Link
          to={`/tasks/${task.id}`}
          data-card-link=""
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          {/* Hero — level, a hairline, the points ring, the modifier. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-lg)",
              marginBottom: "var(--space-lg)",
            }}
          >
            <div
              style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                lineHeight: 1,
              }}
            >
              <span
                style={{ ...CAPTION, fontSize: "var(--text-md)", marginBottom: "var(--space-xs)" }}
              >
                {i18n.t("feed:taskCard.levelCaption")}
              </span>
              <span
                style={{
                  fontFamily: LORA,
                  fontWeight: 600,
                  fontSize: size.numeralSize,
                  lineHeight: 0.9,
                }}
              >
                {task.level_required}
              </span>
            </div>

            <div style={{ flex: 1, height: 1, background: "var(--faction-default-border)" }} />

            {/* Shared with the praxis score stamp (#2042). */}
            <DefaultPointsRing
              value={basePoints}
              unit={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
              size={size.ringSize}
              valueSize={size.numeralSize}
            />

            {/* Faction modifier, hidden at ×1.00 (ADR-0055). */}
            {showMultiplier && (
              <div
                style={{
                  flex: "0 0 auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-xs)",
                }}
              >
                <span
                  style={{
                    fontFamily: LORA,
                    fontWeight: 600,
                    fontSize: "var(--text-xl)",
                    lineHeight: 1,
                    borderRadius: 5,
                    padding: "var(--space-xs) var(--space-sm)",
                    background: "var(--na-task-card-ink)",
                    color: "var(--na-task-card-paper)",
                  }}
                >
                  {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                </span>
                <span style={{ ...CAPTION, fontSize: "var(--text-md)" }}>
                  {i18n.t("feed:taskCard.modifierCaption")}
                </span>
              </div>
            )}
          </div>

          <h2
            style={{
              fontFamily: LORA,
              fontWeight: 600,
              fontStyle: "italic",
              fontSize: size.titleSize,
              lineHeight: 1.14,
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
                fontFamily: MONO,
                lineHeight: 1.55,
                color: "var(--na-task-card-quiet)",
                margin: "0 0 var(--space-lg)",
              }}
            >
              {task.description}
            </p>
          )}

          {inProgressCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                marginBottom: "var(--space-lg)",
              }}
            >
              <span
                aria-hidden="true"
                className="spectrum-rule"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  display: "inline-block",
                  flex: "none",
                }}
              />
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.04em",
                  color: "var(--na-task-card-quiet)",
                }}
              >
                {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
              </span>
            </div>
          )}
        </Link>

        {cta && (
          <>
            {/* Spectrum hairline above the CTA (#2030). Opacity is a custom
                property so Albescent can fade it by cascade (`.alb-task`). */}
            <div
              aria-hidden="true"
              data-cta-rule="default"
              className="spectrum-rule"
              style={{
                height: 1,
                opacity: "var(--faction-default-cta-rule-opacity, 0.6)",
                margin: "0 0 var(--space-lg)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "center" }}>
              {/* Same constant as `DefaultTaskDetail` (#2642); add nothing here. */}
              <CardCtaControl cta={cta} style={DEFAULT_CARD_CTA}>
                {cta.label}
              </CardCtaControl>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
