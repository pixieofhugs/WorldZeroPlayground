import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { CovenBand } from "../cardMasthead/factionBands";
import { CARD_CTA_ROW, COVEN_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import CovenCauldron from "../factionMarks/CovenCauldron";
import { CovenCat, SLIP_SHEET, Thread } from "../factionMarks/covenSlip";
import { useGroundIsBusy } from "../backdrop/BackdropContext";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * Cozy Coven — the candlelit spell slip (#1023). Grenze Gotisch title, Spectral
 * reading copy, Caveat chrome.
 *
 * One responsive component (ADR-0056): `useFormFactor` picks the size set; no
 * mobile twin. `--faction-coven-win-*` tokens stay declared for other surfaces.
 * All colour via `--faction-coven-slip-*`; three inks are walked down for AA
 * against the gradient's darkest stop — see index.css.
 */

const CHROME = "var(--font-faction-script)"; /* Caveat */
const READING = "var(--font-faction-spectral)"; /* Spectral */
const DISPLAY = "var(--font-faction-witch)"; /* Grenze Gotisch */


interface SizeSet {
  /** Raw px on desktop (WORLD_ZERO_STYLE §4a); a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  /**
   * Side of {@link CovenCauldron}, its only dial (text is inside the viewBox).
   * At 116 the caption sets ~8.8px; below ~100 it drops under 8px and stops reading.
   */
  cauldron: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    bodyPad: "var(--space-md) var(--space-xl) var(--space-lg)",
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-display)",
    cauldron: 116,
  },
  mobile: {
    cardWidth: "100%",
    bodyPad: "var(--space-md) var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    cauldron: 100,
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


export default function CovenTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  /* #2396: true only on a profile in a PATTERNED faction's ground. Only the
     watermark branches; the rest is chrome. */
  const groundIsBusy = useGroundIsBusy();
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ ...factionBodyVars("coven"), width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <article
        style={{
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          /* Shared with praxis card and detail columns (#2135); don't retype. */
          background: SLIP_SHEET,
          border: "2px solid var(--faction-coven-slip-border)",
          borderRadius: 18,
          boxShadow: "var(--faction-coven-slip-shadow)",
          color: "var(--faction-coven-slip-ink)",
          fontFamily: CHROME,
        }}
      >
        {/* Watermark cat (#2041); `.cvn-wheel` owns motion + reduced-motion.
            190px at -6/-4 keeps the face inside (a face can't bleed off); only
            a whisker cap clips. Opacity rationale at {@link CovenCat}. On a
            busy ground (#2396) the slip is bare — no substitute texture. */}
        {!groundIsBusy && (
          <CovenCat size={190} style={{ right: -6, bottom: -4, opacity: 0.09 }} />
        )}

        {/* Shared masthead band (#2185), worn by the praxis card too; paint in
            `cardMasthead/factionBands`. A card draws one faction mark in its header. */}
        <CovenBand />

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Card-sized link around all but the CTA (no <button> in an <a>). */}
          <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-xs)" }}>
                <span style={{ fontFamily: READING, fontSize: size.levelSize, lineHeight: 0.8 }}>
                  {task.level_required}
                </span>
                {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption set to the numeral beside it, not the label ramp. */}
                <span style={{ ...CAPTION, fontSize: 8.5 }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
              </div>

              <Thread style={{ flex: 1, minWidth: 0 }} />

              {/* Faction modifier, hidden at ×1.00 (ADR-0055). */}
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

              {/* Score in the shared cauldron (#2033, owner ruling: one pot, same
                  as the praxis score stamp). Numeral is inside the viewBox. */}
              <CovenCauldron
                total={String(basePoints)}
                caption={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                size={size.cauldron}
              />
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

        {/* CTA is a rounded box (radius 12), not a pill: at 20 it would read as
            the modifier chip (#2033). No rule above; the braid is the tie-off. */}
        {cta && (
          <div style={{ ...CARD_CTA_ROW, position: "relative", zIndex: 2 }}>
            {/* Same constant as `CovenTaskDetail` (#2642); add nothing at either site. */}
            <CardCtaControl cta={cta} style={COVEN_CARD_CTA}>
              <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                <path
                  d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
                  fill="currentColor"
                />
              </svg>
              {cta.label}
            </CardCtaControl>
          </div>
        )}
      </article>
    </div>
  );
}
