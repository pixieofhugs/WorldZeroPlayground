import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { EverymenBand } from "../cardMasthead/factionBands";
import PointsRoundel from "../factionMarks/PointsRoundel";
import { EverymenCog } from "../factionMarks/everymenCogs";
import { FistAndBolt } from "../factionMarks/everymenFistBolt";
import { CARD_CTA_ROW, EVERYMEN_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import { useGroundIsBusy } from "../backdrop/BackdropContext";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionRoleVars } from "../../utils/factionRoles";
import { factionBodyVars } from "../../utils/factionBodyFace";

/**
 * Everymen — THE HELP WANTED BILL (#1023): a WPA union broadsheet with a red
 * masthead, poster rays, a typewritten brief, the shared {@link PointsRoundel}
 * seal and a fist-and-bolt either side of the CTA (#2034). One responsive
 * component (ADR-0056). Geometry is inline: this is a lazy archetype, off the
 * critical path. Motion lives in `src/motion.ornament.css` (see {@link FistAndBolt}).
 */

const POSTER = "var(--ev-task-face)"; /* Bebas Neue */
const TYPED = "var(--faction-everymen-body-font)"; /* Courier Prime */

/** Flips with the paper; not `--everymen-ink`, which vanishes on a dark bill. */
const INK = "var(--everymen-paper-text)";

interface SizeSet {
  /** Geometry (§4a) on desktop; a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  /** Seal diameter; the roundel typesets itself from it. */
  seal: number;
  /** Fist-and-bolt flex BASIS: the pair shrinks before the button does. */
  mark: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    bodyPad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-display)",
    seal: 70,
    mark: 96,
  },
  mobile: {
    cardWidth: "100%",
    bodyPad: "var(--space-lg) var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    seal: 62,
    mark: 84,
  },
};

const LABEL: CSSProperties = {
  fontFamily: POSTER,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

export default function EverymenTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const groundIsBusy = useGroundIsBusy();
  const size = SIZES[formFactor];
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{
        ...factionBodyVars("everymen"), ...factionRoleVars("everymen", "ev-task"),
        width: size.cardWidth,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <article
        style={{
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--everymen-paper)",
          color: INK,
          border: `2px solid ${INK}`,
          borderRadius: 2,
          padding: "var(--space-xs)",
          boxShadow: "var(--faction-everymen-bill-shadow)",
        }}
      >
        <div style={{ position: "relative", overflow: "hidden", border: `1px solid ${INK}`, borderRadius: 1 }}>
          {/* The faction's one ornament (`.em-burst`, index.css); on any
              patterned page ground the card goes bare (#2393). Nothing else
              branches on the ground. */}
          {!groundIsBusy && <div aria-hidden="true" className="em-burst" />}

          <EverymenBand />

          <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
            {/* Everything but the CTA is the link (no <button> nested in an <a>). */}
            <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              {/* Two EQUAL halves put the cog on the sheet's centreline (#1965).

                  ponytail: equal only while each half holds < half the row; a
                  non-1.0 modifier badge pushes the cog left on mobile. Upgrade:
                  give the badge its own line under the seal. */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                    <span style={{ ...LABEL, fontSize: "var(--text-base)", color: "var(--everymen-muted)", marginBottom: "var(--space-xs)" }}>
                      {i18n.t("feed:taskCard.levelCaption")}
                    </span>
                    <span style={{ fontFamily: POSTER, fontSize: size.levelSize, lineHeight: 0.82 }}>
                      {task.level_required}
                    </span>
                  </div>
                  <span aria-hidden="true" style={{ flex: 1, height: 0, borderTop: "2px dashed var(--everymen-red)" }} />
                </div>

                <EverymenCog size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />

                <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <span aria-hidden="true" style={{ flex: 1, height: 0, borderTop: "2px dashed var(--everymen-red)" }} />

                  {/* Faction modifier, hidden at ×1.00 (ADR-0055). */}
                  {showMultiplier && (
                    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                      <span
                        style={{
                          ...LABEL,
                          fontSize: "var(--text-lg)",
                          letterSpacing: "0.04em",
                          color: "var(--faction-everymen-bill-mult-ink)",
                          border: "1.5px solid var(--everymen-gold)",
                          borderRadius: 2,
                          padding: "var(--space-xs) var(--space-sm)",
                        }}
                      >
                        {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                      </span>
                      <span style={{ ...LABEL, fontSize: "var(--text-md)", color: "var(--everymen-muted)" }}>
                        {i18n.t("feed:taskCard.modifierCaption")}
                      </span>
                    </div>
                  )}

                  {/* No `arcLabel`: "VERIFIED ON THE RECORD" can't apply to an
                      unattempted task. The roundel uppercases `pointsUnit`. */}
                  <PointsRoundel
                    total={String(basePoints)}
                    unitLabel={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                    size={size.seal}
                    color="var(--everymen-red)"
                  />
                </div>
              </div>

              <h2
                style={{
                  fontFamily: POSTER,
                  fontSize: size.titleSize,
                  lineHeight: 0.96,
                  letterSpacing: "0.01em",
                  textTransform: "uppercase",
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
                    fontFamily: TYPED,
                    lineHeight: 1.55,
                    color: "var(--everymen-muted)",
                    margin: "0 0 var(--space-md)",
                  }}
                >
                  {task.description}
                </p>
              )}

              <div aria-hidden="true" style={{ borderTop: "2px dashed var(--everymen-red)", margin: "0 0 var(--space-md)" }} />

              {inProgressCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <EverymenCog size={15} fill="var(--everymen-red)" hub="var(--everymen-paper)" />
                  <span style={{ fontFamily: TYPED, fontSize: "var(--text-lg)", color: "var(--everymen-muted)" }}>
                    {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* The marks flank the button inside the shared row, unpositioned, so
              the row's centring holds and the marks shrink first. */}
          {cta && (
            <div style={{ ...CARD_CTA_ROW, alignItems: "center", gap: "var(--space-sm)", position: "relative", zIndex: 2 }}>
              <FistAndBolt width={size.mark} mirrored />
              {/* Shared with `EverymenTaskDetail` (#2642); add nothing here. */}
              <CardCtaControl cta={cta} style={EVERYMEN_CARD_CTA}>
                {cta.label}
              </CardCtaControl>
              <FistAndBolt width={size.mark} />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
