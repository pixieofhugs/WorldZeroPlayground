import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { EphemeristsBand } from "../cardMasthead/factionBands";
/* No `CARD_CTA_ROW`: rule and button share one inset box. */
import { EPHEMERISTS_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import EphemeristsNotationBand from "../factionMarks/EphemeristsNotationBand";
import EphemeristsGloss from "../factionMarks/EphemeristsGloss";
import {
  CardGravityField,
  CompassRose,
  Cornice,
  GLYPHS,
  Tally,
  WASH,
  chamferMount,
  chamferSheet,
} from "../factionMarks/ephemeristsPlate";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * The Ephemerists — THE VALLEY PLATE (#1023): a papyrus plate ruled in brass,
 * points on a compass rose (#2037), level as numeral over tally strokes, CTA an
 * inset cartouche bracketed by notation bands. Masthead is the plain kit band
 * (#2067). One responsive component (ADR-0056).
 *
 * All colour via `--faction-ephemerists-plate-*`. `-brass` is a rule colour,
 * never an ink — the "Level" caption takes `-caption` (same hue at AA).
 */

/** Cinzel via the engraved token — NOT `--faction-ephemerists-card-font`. */
const DECO = "var(--font-faction-engraved)";
const CAPS = "var(--font-faction-engraved)"; /* Cinzel */
const READING = "var(--font-faction-deco)"; /* Poiret One */

interface SizeSet {
  /** Geometry (§4a) on desktop; a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  /**
   * Nominal gravity-field width; never a string — `CardGravityField` sizes an
   * SVG with it (#2763). A wider card scales the rows up.
   */
  fieldWidth: number;
  /** Points plate box; the rose's clear field is 48% of it, so it must stay legible. */
  medallion: number;
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  pointsSize: string;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    fieldWidth: 384,
    medallion: 128,
    bodyPad: "0 var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-display)",
    pointsSize: "var(--text-heading)",
  },
  mobile: {
    cardWidth: "100%",
    fieldWidth: 340,
    medallion: 112,
    bodyPad: "0 var(--space-xl) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    pointsSize: "var(--text-title)",
  },
};

const SMALL_CAPS: CSSProperties = {
  fontFamily: CAPS,
  fontWeight: 500,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
};

/* No rule between description and in-progress line (#1638): the motif already
   brackets the CTA twice, a third row would read as repetition. */

export default function EphemeristsTaskCard({
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
      style={{ ...factionBodyVars("ephemerists"), width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      {/* `eph-turn-scope`: WCAG 2.2.2 pause on hover/focus (index.css). */}
      <article
        className="eph-turn-scope"
        style={{
          position: "relative",
          /* Own stacking context: ground 1, band 2, cornice 3 settle inside
             the card. Not a z-lift on content — that needs `position:
             relative`, which would break the absolutely positioned ornament. */
          isolation: "isolate",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--faction-ephemerists-plate-bg)",
          color: "var(--faction-ephemerists-plate-ink)",
          border: "1px solid var(--faction-ephemerists-plate-brass)",
          outline: "1px solid var(--faction-ephemerists-plate-brass-light)",
          outlineOffset: 3,
          boxShadow: "var(--faction-ephemerists-plate-shadow)",
        }}
      >
        {/* The one ornament; `CardGravityField` drops it on an ornamented page
            ground (#2398). No chart net here — "either burst, or plain". */}
        <CardGravityField width={size.fieldWidth} />

        <EphemeristsBand />
        <Cornice flutes={40} />

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA is the link (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-md) 0 var(--space-lg)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--space-xs)", lineHeight: 1 }}>
                <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: "var(--faction-ephemerists-plate-caption)" }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: DECO, fontSize: size.levelSize, lineHeight: 0.8 }}>
                  {task.level_required}
                </span>
                <Tally level={task.level_required} />
              </div>

              {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the lead between three 1px hairlines. */}
              <div aria-hidden="true" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                {[1, 0.7, 0.4].map((strength, i) => (
                  <span
                    key={strength}
                    style={{
                      height: 1,
                      background: "var(--faction-ephemerists-plate-brass)",
                      opacity: strength * 0.65,
                      marginRight: i * 14,
                    }}
                  />
                ))}
              </div>

              {/* Faction modifier, hidden at ×1.00 (ADR-0055). */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  {/* Rule is the GROUND, not a border: `clip-path` would shave
                      a border at the cuts (#2150). */}
                  <span style={{ ...chamferMount(6), display: "inline-flex" }}>
                    <span
                      style={{
                        ...chamferSheet(6, WASH),
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "var(--space-xs) var(--space-sm)",
                        fontFamily: CAPS,
                        fontWeight: 600,
                        fontSize: "var(--text-lg)",
                        lineHeight: 1,
                      }}
                    >
                      {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                    </span>
                  </span>
                  <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: "var(--faction-ephemerists-plate-caption)" }}>
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              {/* Figure and unit stay HTML over the rose so the unit is one
                  replaceable node the gloss can turn (#2038). */}
              <div
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: size.medallion,
                  height: size.medallion,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CompassRose size={size.medallion} />
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.82 }}>
                  {/* Dark chip on a light sheet (#2141): inherited `-plate-ink`
                      would read 1.00:1 on the disc; `-band-ink` is 7.59:1. */}
                  <span style={{ fontFamily: DECO, fontSize: size.pointsSize, color: "var(--faction-ephemerists-plate-band-ink)" }}>{basePoints}</span>
                  {/* eslint-disable-next-line local/no-raw-style-values -- ornament: caption engraved inside the rose. */}
                  <span data-points-label="ephemerists" style={{ ...SMALL_CAPS, fontSize: 7, letterSpacing: "0.2em", marginTop: "var(--space-xs)", color: "var(--faction-ephemerists-plate-band-quiet)" }}>
                    <EphemeristsGloss
                      word="points"
                      english={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
                      ordinal={0}
                    />
                  </span>
                </div>
              </div>
            </div>

            <h2
              style={{
                fontFamily: DECO,
                fontSize: size.titleSize,
                letterSpacing: "0.02em",
                lineHeight: 1.24,
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
                  lineHeight: 1.55,
                  color: "var(--faction-ephemerists-plate-muted)",
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <svg width={15} height={15} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path
                    d={GLYPHS.hourglass}
                    fill="none"
                    stroke="var(--faction-ephemerists-plate-brass)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontFamily: READING,
                    fontSize: "var(--text-xl)",
                    color: "var(--faction-ephemerists-plate-muted)",
                  }}
                >
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Outside `bodyPad` (the trailing band closes the card), so it carries
            the `--space-xl` inset itself. One column (#2724): rule, button and
            both rune rows share this box's width; nothing insets or bleeds. */}
        {cta && (
          <div style={{ position: "relative", zIndex: 2, padding: "0 var(--space-xl)" }}>
            <div
              aria-hidden="true"
              data-cta-rule="ephemerists"
              style={{
                height: 3,
                /* The notation band's closing pair (#2146 §4), in LINE brass. */
                borderTop: "1px solid var(--faction-ephemerists-plate-brass-rule)",
                borderBottom: "3px double var(--faction-ephemerists-plate-brass-rule)",
                margin: "0 0 var(--space-md)",
              }}
            />
            <EphemeristsNotationBand side="top" seed={`task:${task.id}`} />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <CardCtaControl
                cta={cta}
                /* Paint lives on `.eph-cta` (#2146): the enclosure changes width
                   per theme, so no inline `background`/`border` here. */
                className="eph-cta"
                /* Shared with `EphemeristsTaskDetail` (#2642). */
                style={EPHEMERISTS_CARD_CTA}
              >
                <svg width={17} height={17} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path d={GLYPHS.platinum} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* A refusal does not turn: the gloss frames all mean *sign up*. */}
                {cta.denied ? (
                  <span>{cta.label}</span>
                ) : (
                  <EphemeristsGloss word="signup" english={cta.label} ordinal={1} />
                )}
                <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "0 0 auto" }}>
                  <path d={GLYPHS.planet} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </CardCtaControl>
            </div>
            <EphemeristsNotationBand side="bottom" seed={`task:${task.id}`} />
          </div>
        )}
      </article>
    </div>
  );
}
