import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import CardMasthead from "./CardMasthead";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { factionName } from "../../utils/factions";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { Lotus } from "../factionMarks";
import { UA_DISPLAY, UA_EYEBROW, UA_TEXT, UaEnsoScore } from "../factionMarks/uaAtoms";

/**
 * UA — THE VELLUM LEAF (task card v2, #1023).
 *
 * A leaf of sun-bleached vellum bound in sienna, with a lotus hanging off the
 * top-left corner as a ground wash and the task's marks held in an ensō at the
 * centre of the hero. Cormorant Garamond carries the title and the numerals; EB
 * Garamond carries everything read.
 *
 * This replaces "The Ink Column" (ADR-0055 / ADR-0056). The hairline down the
 * left margin is gone; the gilt-sandwich salon it replaced is still gone.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not a
 * different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * TWO MARKS, AND THE COUNT IS THE POINT (WORLD_ZERO_STYLE §6). The design draws
 * the ensō three times — in the eyebrow, behind the score, and again on the
 * sign-up button. The third is the mark spent as decoration, so it is dropped:
 * the ensō is reserved for the SCORE and the FACTION MARK, and a seal on a
 * button is neither. The eyebrow mark stood beside the uniform "Task {id}"
 * ordinal until #1124 retired the id, and kept its line alone until #2029 gave
 * the card a masthead — the faction mark now sits in the band, which is the
 * same one mark in a better place, and the count is still two.
 *
 * THE LOTUS COMES BACK, and that reverses a line in this file's old docstring.
 * #851 read the kit's corner-bleed as something "the brief's strength ruling
 * supersedes" — but that ruling is `UaMandala`'s, and the mandala is a different
 * mark: radial concentric geometry, `absent` on dense text surfaces. The lotus
 * has its own precedent on exactly this kind of surface (`UaPraxisCard` floats
 * one off its left edge at the same opacity token). The MANDALA stays absent
 * here; the lotus is drawn as the design draws it.
 *
 * Both marks are inline/masked components tinted from tokens, so the design's
 * four `filter:` recolour hacks (`brightness(0) invert(1)`, `saturate(1.35)` and
 * friends) have no translation and are simply gone — that is what ADR-0049's
 * "tintable from a token" buys.
 *
 * Every colour is an already-shipped `--faction-ua-*` token; this card added
 * none. One ink is walked down — see the score note below.
 */

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  pad: string;
  levelSize: string;
  /** Diameter of the score's ensō, and of the lotus wash. Geometry. */
  enso: number;
  lotus: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    pad: "var(--space-lg) var(--space-xl) var(--space-xl)",
    levelSize: "var(--text-heading)",
    enso: 96,
    lotus: 360,
  },
  mobile: {
    cardWidth: 340,
    pad: "var(--space-lg)",
    levelSize: "var(--text-title)",
    enso: 84,
    lotus: 300,
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
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          width: "100%",
          background: "var(--faction-ua-card-parchment)",
          border: "2px solid var(--faction-ua-card-frame)",
          borderRadius: 7,
          color: "var(--faction-ua-card-text)",
          fontFamily: UA_TEXT,
        }}
      >
        {/* The ground wash — the lotus hangs off the top-left corner with its
            centre pulled onto the leaf. Raw geometry on purpose: an ornament's
            position is illustration, not layout spacing (§4a). Its opacity is a
            token, so dark mode lifts it through the cascade rather than through
            the design's `saturate(1.35) brightness(1.2)`. */}
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

        {/* THE LEAF GAINS A MASTHEAD (#2029). UA shipped none: the top of the
            card was a bare eyebrow holding the ensō alone, once #1124 took the
            "Task {id}" ordinal that stood beside it. The band is the kit's
            shared anatomy — the mark hard left, the faction's name centred — and
            the eyebrow stands down with it, because the ensō it held is the
            same mark the band now carries and no card draws two.

            THE WORDMARK TAKES THE BODY INK, NOT THE ACCENT. The design sets it
            in `--faction-ua-card-accent` on `--faction-ua-hair`, which measures
            4.46:1 in light — under AA for a 24px non-bold face, and the band's
            whole job is to be read. `-card-text` is 10.35:1 on the same ground
            (11.45:1 in dark) and is the leaf's own ink; the accent keeps the
            band's bottom rule, where a hairline owes nothing. */}
        <CardMasthead
          slug="ua"
          style={{
            background: "var(--faction-ua-hair)",
            borderBottom: "1px solid var(--faction-ua-card-accent)",
          }}
        >
          <span
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: "var(--text-title)",
              letterSpacing: "0.08em",
              lineHeight: 1,
            }}
          >
            {factionName("ua")}
          </span>
        </CardMasthead>

        <div style={{ position: "relative", padding: size.pad }}>
          {/* Everything but the CTA reads the full call — a card-sized target
              that stays valid HTML (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
                <span style={{ ...UA_EYEBROW, fontSize: "var(--text-md)", marginBottom: "var(--space-xs)" }}>
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: UA_DISPLAY, fontWeight: 700, fontSize: size.levelSize, lineHeight: 0.9 }}>
                  {task.level_required}
                </span>
              </div>

              <span aria-hidden="true" style={{ flex: 1, height: 1, background: "var(--faction-ua-hair)" }} />

              {/* The faction modifier — hidden at ×1.00, so invisible under
                  era_1's neutralized modifiers and automatic the day one moves
                  (ADR-0055). */}
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

              {/* The score, in the ensō — the mark's one sanctioned use besides
                  the faction mark above. The numeral takes `card-accent` rather
                  than the design's brighter `--faction-ua-glow`, which measures
                  2.93:1 on the parchment's darkest stop and so misses even the
                  large-text floor; the accent is 4.88:1 there and clears the
                  normal one. */}
              <UaEnsoScore
                size={size.enso}
                value={basePoints}
                unit={i18n.t("feed:taskCard.pointsUnit")}
                valueColor="var(--faction-ua-card-accent)"
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
                  color: "var(--faction-ua-card-muted)",
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
                    color: "var(--faction-ua-card-muted)",
                  }}
                >
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>

          {cta && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-lg)" }}>
              <button
                type="button"
                onClick={cta.onPress}
                aria-disabled={cta.denied || undefined}
                style={{
                  cursor: cta.denied ? "not-allowed" : "pointer",
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-content)",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  padding: "var(--space-sm) var(--space-xl)",
                  borderRadius: 5,
                  color: "var(--faction-ua-card-chip-ink)",
                  background: "var(--faction-ua-card-chip-bg)",
                  border: "1.5px solid var(--faction-ua-card-frame)",
                }}
              >
                {cta.label}
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
