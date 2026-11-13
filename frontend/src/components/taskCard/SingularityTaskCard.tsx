import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { useGroundIsBusy } from "../backdrop/BackdropContext";
import { SingularityBand } from "../cardMasthead/factionBands";
import { SINGULARITY_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import SingularityProcessLight from "../factionMarks/SingularityProcessLight";
import { SINGULARITY_BOT, SingularitySweep } from "../factionMarks/singularityAtoms";
import SingularityReadout from "../factionMarks/SingularityReadout";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";

/**
 * Singularity — THE TERMINAL SESSION (#1023): window chrome, a LEVEL + POINTS
 * readout in a lit well, a standing raster and a scan sweep. Share Tech Mono
 * throughout. One responsive component (ADR-0056).
 *
 * ALWAYS DARK in both themes (WORLD_ZERO_STYLE §6); the cascade flips the
 * phosphor (`--faction-singularity-term-*`), never a ternary. Motion is
 * index.css's (`.sg-cursor`, `.sg-scan`, `.sg-pulse`), reduced-motion guarded.
 */

const MONO = "var(--sg-task-card-face)"; /* Share Tech Mono */

/** The ASCII bot beside the sign-up (#2036); `aria-hidden`, outside the button. */
const BOT = SINGULARITY_BOT;

const BG = "var(--faction-singularity-term-bg)";
const BRIGHT = "var(--faction-singularity-term-bright)";
const DIM = "var(--faction-singularity-term-dim)";
const HAIR = "var(--faction-singularity-term-hair)";

interface SizeSet {
  /** Geometry (§4a) on desktop; a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    bodyPad: "var(--space-lg) var(--space-lg) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-heading)",
  },
  mobile: {
    cardWidth: "100%",
    bodyPad: "var(--space-lg) var(--space-md) var(--space-lg)",
    titleSize: "var(--text-content)",
    levelSize: "var(--text-title)",
    pointsSize: "var(--text-title)",
  },
};

const LABEL: CSSProperties = {
  fontFamily: MONO,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: DIM,
};

function Rule({ style }: { style?: CSSProperties }) {
  return <div aria-hidden="true" style={{ height: 0, borderTop: `1px dashed ${HAIR}`, ...style }} />;
}

export default function SingularityTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  // On a patterned page ground the raster comes off; the chassis goes bare (#2195).
  const groundIsBusy = useGroundIsBusy();
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
          ...factionBodyVars("singularity"), ...factionRoleVars("singularity", "sg-task-card"),
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: BG,
          border: "1px solid var(--faction-singularity-term-border)",
          borderRadius: 8,
          boxShadow: "var(--faction-singularity-term-shadow)",
          color: "var(--faction-singularity-term-ink)",
          fontFamily: MONO,
        }}
      >
        {/* The kit's one ornament (#2394), shared with the praxis card. */}
        {!groundIsBusy && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 3,
              background:
                "repeating-linear-gradient(0deg, var(--faction-singularity-term-scan) 0 1px, transparent 1px 3px)",
            }}
          />
        )}

        <SingularitySweep />

        <SingularityBand />

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA is the link (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <span style={{ ...LABEL, fontSize: "var(--text-md)", marginBottom: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: MONO, fontSize: size.levelSize, lineHeight: 0.85, color: BRIGHT }}>
                  {String(task.level_required).padStart(2, "0")}
                </span>
              </div>

              <Rule style={{ flex: 1, marginBottom: "var(--space-md)" }} />

              {/* Faction modifier, hidden at ×1.00 (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "var(--text-lg)",
                      lineHeight: 1,
                      color: "var(--faction-singularity-term-cta-ink)",
                      background: BRIGHT,
                      borderRadius: 4,
                      padding: "var(--space-xs) var(--space-sm)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span style={{ ...LABEL, fontSize: "var(--text-md)" }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              <SingularityReadout
                value={basePoints}
                unit={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                valueSize={size.pointsSize}
                style={{ flex: "0 0 auto" }}
              />
            </div>

            <h2
              style={{
                fontFamily: MONO,
                fontSize: size.titleSize,
                lineHeight: 1.22,
                color: BRIGHT,
                margin: "0 0 var(--space-sm)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h2>

            {task.description && (
              <p
                className="card-description"
                style={{ fontFamily: MONO, lineHeight: 1.55, color: DIM, margin: "0 0 var(--space-md)" }}
              >
                {task.description}
              </p>
            )}

            <Rule style={{ margin: "0 0 var(--space-md)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <SingularityProcessLight />
                <span style={{ fontFamily: MONO, fontSize: "var(--text-xl)", color: DIM }}>
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>

          {cta && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: "var(--space-sm)",
                marginTop: "var(--space-lg)",
              }}
            >
              {/* Shared with `SingularityTaskDetail` (#2642); add nothing here. */}
              <CardCtaControl cta={cta} style={SINGULARITY_CARD_CTA}>
                {cta.label}
                {/* Stilled under reduced motion it stays drawn: punctuation, not an indicator. */}
                <span
                  aria-hidden="true"
                  className="sg-cursor"
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 13,
                    marginLeft: "var(--space-xs)",
                    background: "currentColor",
                    verticalAlign: "-0.12em",
                  }}
                />
              </CardCtaControl>

              {/* Outside the button so it never joins the accessible name
                  (#2027). A grid column, not `position:absolute`, so it can't
                  overlap the 44px target; `minWidth: 0` lets it clip under a
                  long denial label. Drift: `sg-float` in `motion.ornament.css`. */}
              <pre
                aria-hidden="true"
                className="sg-ascii"
                style={{
                  gridColumn: 3,
                  justifySelf: "center",
                  minWidth: 0,
                  overflow: "hidden",
                  margin: 0,
                  fontFamily: MONO,
                  fontSize: "var(--text-lg)",
                  lineHeight: 1.2,
                  color: DIM,
                }}
              >
                {BOT}
              </pre>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
