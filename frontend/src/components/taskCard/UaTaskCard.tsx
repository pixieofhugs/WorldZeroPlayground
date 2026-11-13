import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { UaBand } from "../cardMasthead/factionBands";
import { UA_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";
import { Lotus } from "../factionMarks";
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT, UaCtaFlank, UaEnsoScore } from "../factionMarks/uaAtoms";

/**
 * UA — THE VELLUM LEAF (#1023): vellum bound in sienna, a lotus ground wash off
 * the top-left corner, the score held in an ensō. One responsive component
 * (ADR-0056).
 *
 * TWO MARKS (WORLD_ZERO_STYLE §6): the ensō is reserved for the SCORE and the
 * FACTION MARK (in the band) — never on the button. The mandala stays `absent`
 * in the reading column; it only flanks the CTA, below the rule (#2031).
 * Marks are tinted from tokens (ADR-0049), so no `filter:` recolour hacks.
 */

interface SizeSet {
  /** Geometry (§4a) on desktop; a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  pad: string;
  levelSize: string;
  enso: number;
  lotus: number;
  flank: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    pad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    levelSize: "var(--text-display)",
    enso: 124,
    lotus: 360,
    flank: 46,
  },
  mobile: {
    cardWidth: "100%",
    pad: "var(--space-lg)",
    levelSize: "var(--text-heading)",
    enso: 108,
    lotus: 300,
    flank: 38,
  },
};

export default function UaTaskCard({
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
          ...factionBodyVars("ua"), ...factionRoleVars("ua", "leaf-task-card"),
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--faction-ua-card-parchment)",
          border: "2px solid var(--faction-ua-card-frame)",
          borderRadius: "var(--leaf-task-card-radius)",
          color: "var(--leaf-task-card-ink)",
          fontFamily: UA_TEXT,
        }}
      >
        {/* Raw geometry on purpose: ornament position is illustration (§4a). */}
        <Lotus
          size={size.lotus}
          color="var(--faction-ua-card-lotus)"
          style={{
            position: "absolute",
            left: -150,
            top: -104,
            opacity: "var(--faction-ua-card-lotus-opacity)",
            pointerEvents: "none",
          }}
        />

        <UaBand />

        <div style={{ position: "relative", padding: size.pad }}>
          {/* Everything but the CTA is the link (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <span style={{ ...UA_EYEBROW, fontSize: "var(--text-md)", marginBottom: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                {/* One tier up (#2031): Cormorant is small-faced, so it needs
                    a bigger size to carry the kit's visual weight. */}
                <span style={{ fontFamily: UA_DISPLAY, fontWeight: 700, fontSize: size.levelSize, lineHeight: 0.9 }}>
                  {task.level_required}
                </span>
              </div>

              <span aria-hidden="true" style={{ flex: 1, height: 1, background: "var(--faction-ua-hair)" }} />

              {/* Faction modifier, hidden at ×1.00 (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: UA_DISPLAY,
                      fontWeight: 700,
                      fontSize: "var(--text-xl)",
                      lineHeight: 1,
                      color: "var(--faction-ua-card-chip-ink)",
                      background: "var(--faction-ua-card-chip-bg)",
                      borderRadius: 4,
                      padding: "var(--space-xs) var(--space-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span style={{ ...UA_EYEBROW, fontSize: "var(--text-md)" }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* Numeral in `accent`, not `--faction-ua-glow` (2.93:1 on the
                  darkest parchment stop; accent is 4.88:1). Ring is 124 so
                  "POINTS" fits its chord (#2031): type wins, geometry moves. */}
              <UaEnsoScore
                size={size.enso}
                value={basePoints}
                unit={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                valueColor="var(--leaf-task-card-accent)"
              />
            </div>

            <h2
              className="content-title"
              style={{
                fontFamily: UA_DISPLAY,
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: "-0.01em",
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
                  fontFamily: UA_TEXT,
                  lineHeight: 1.5,
                  color: "var(--leaf-task-card-quiet)",
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <span
                  aria-hidden="true"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--faction-ua-glow)", display: "block", flex: "0 0 auto" }}
                />
                <span
                  style={{
                    fontFamily: UA_TEXT,
                    fontStyle: "italic",
                    fontSize: "var(--text-xl)",
                    color: "var(--leaf-task-card-quiet)",
                  }}
                >
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>

          {cta && (
            <>
              {/* Closes the reading column off from the sign-up (#2030). */}
              <div
                aria-hidden="true"
                data-cta-rule="ua"
                style={{
                  height: 1,
                  background: "var(--faction-ua-hair)",
                  margin: "var(--space-lg) 0",
                }}
              />
              {/* Three in-flow items, control in the middle (UaCtaFlank). */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-md)" }}>
              <UaCtaFlank side="start" size={size.flank} />
              {/* Shared with `UaTaskDetail` (#2642); add nothing here. */}
              <CardCtaControl cta={cta} style={UA_CARD_CTA}>
                {cta.label}
              </CardCtaControl>
              <UaCtaFlank side="end" size={size.flank} />
              </div>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
