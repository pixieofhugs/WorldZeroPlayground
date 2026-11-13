import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { SnideBand } from "../cardMasthead/factionBands";
import { CARD_CTA_ROW, SNIDE_CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import { PenCircle, RANSOM_CUTS, WALL, WALL_PLAIN } from "../factionMarks/snideAtoms";
import { useGroundIsBusy } from "../backdrop/BackdropContext";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * S.N.I.D.E. — THE RANSOM CLIPPING (#1023): a clipping pasted on the wall, a
 * headline cut word by word from mixed faces, points circled in pink pen, censor
 * rules between sections. One responsive component (ADR-0056).
 *
 * THE CENSOR REDACTS ORNAMENT, NEVER CONTENT (owner, #1023): the brief renders
 * whole. Do not reintroduce a word-level strike.
 *
 * `--faction-snide-note-*` FLIPS under `[data-theme="dark"]`. Permanent Marker
 * appears on the CTA only (#2035): "{n} in progress" is one localized string.
 */

const IMPACT = "var(--faction-snide-font-black)"; /* Archivo Black */
const BLACK = "var(--faction-snide-font-black)"; /* Archivo Black */
const TYPE = "var(--faction-snide-font-type)"; /* Special Elite */

const INK = "var(--faction-snide-note-ink)";
const MUTED = "var(--faction-snide-note-muted)";

interface SizeSet {
  /** Geometry (§4a) on desktop; a phone card fills its column (#2763). */
  cardWidth: number | "100%";
  bodyPad: string;
  titleSize: string;
  levelSize: string;
  stamp: number;
}

const SIZES: Record<"desktop" | "mobile", SizeSet> = {
  desktop: {
    cardWidth: 384,
    bodyPad: "0 var(--space-xl) var(--space-xl)",
    titleSize: "var(--text-heading)",
    levelSize: "var(--text-display)",
    stamp: 96,
  },
  mobile: {
    cardWidth: "100%",
    bodyPad: "0 var(--space-lg) var(--space-lg)",
    titleSize: "var(--text-title)",
    levelSize: "var(--text-heading)",
    stamp: 86,
  },
};

/** `.snd-censor` owns its pigments. */
function CensorRule({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="snd-censor" style={style} />;
}

export default function SnideTaskCard({
  task,
  basePoints,
  multiplier,
  inProgressCount,
  onSignup,
}: CardProps) {
  const formFactor = useFormFactor();
  const size = SIZES[formFactor];
  const groundIsBusy = useGroundIsBusy();
  const cta = taskCardSignupCta(task, onSignup);
  const showMultiplier = !isNeutralMultiplier(multiplier);

  return (
    <div
      data-form-factor={formFactor}
      style={{ ...factionBodyVars("snide"), width: size.cardWidth, maxWidth: "100%", boxSizing: "border-box" }}
    >
      {/* Ground is the flyposted {@link WALL}; on a patterned page ground it
          goes bare ({@link WALL_PLAIN}, #2395). Chrome never branches on it.
          The edge and shadow are load-bearing: on the S.N.I.D.E. page the
          backdrop is this same wall. Shadow token is not `-note-shadow` (#2066). */}
      <article
        style={{
          position: "relative",
          boxSizing: "border-box",
          width: "100%",
          color: INK,
          background: groundIsBusy ? WALL_PLAIN : WALL,
          border: "1px solid var(--faction-snide-note-wall-edge)",
          boxShadow: "var(--faction-snide-note-wall-shadow)",
          transform: "rotate(-0.4deg)",
        }}
      >
        <SnideBand />

        <div style={{ position: "relative", zIndex: 2, padding: size.bodyPad }}>
          {/* Everything but the CTA is the link (no <button> nested in an <a>). */}
          <Link to={`/tasks/${task.id}`} data-card-link="" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)", padding: "var(--space-lg) 0 var(--space-md)" }}>
              <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <span
                  style={{
                    fontFamily: TYPE,
                    fontSize: "var(--text-md)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: MUTED,
                  }}
                >
                  {i18n.t("feed:taskCard.levelCaption")}
                </span>
                <span style={{ fontFamily: IMPACT, fontSize: size.levelSize, lineHeight: 0.82, transform: "rotate(-1.5deg)" }}>
                  {task.level_required}
                </span>
              </div>

              <CensorRule style={{ flex: 1, minWidth: 0, marginBottom: "var(--space-sm)" }} />

              {/* Faction modifier, hidden at ×1.00 (ADR-0055). Near-black ink on
                  pink: paper would be 3.10:1. */}
              {showMultiplier && (
                <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-xs)" }}>
                  <span
                    style={{
                      fontFamily: BLACK,
                      fontSize: "var(--text-md)",
                      color: "var(--faction-snide-note-cta-ink)",
                      background: "var(--faction-snide-pink)",
                      padding: "var(--space-xs) var(--space-sm)",
                      letterSpacing: "0.04em",
                      transform: "rotate(-2deg)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {i18n.t("feed:taskCard.multiplier", { value: multiplier.toFixed(2) })}
                  </span>
                  <span
                    style={{
                      fontFamily: TYPE,
                      fontSize: "var(--text-md)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    {i18n.t("feed:taskCard.modifierCaption")}
                  </span>
                </div>
              )}

              <PenCircle
                size={size.stamp}
                value={basePoints}
                unit={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
              />
            </div>

            {/* Must stay one readable string: inline flow with REAL spaces, not
                a flex row — flex drops whitespace-only children and the words
                run together in the text content. */}
            <h2
              style={{
                fontSize: size.titleSize,
                lineHeight: 1.35,
                margin: "0 0 var(--space-md)",
              }}
            >
              {task.title.split(/\s+/).map((word, index) => (
                <span key={`${index}-${word}`}>
                  {index > 0 ? " " : ""}
                  <span
                    style={{
                      display: "inline-block",
                      maxWidth: "100%",
                      overflowWrap: "anywhere",
                      ...RANSOM_CUTS[(index + task.id) % RANSOM_CUTS.length],
                    }}
                  >
                    {word}
                  </span>
                </span>
              ))}
            </h2>

            {task.description && (
              <p
                className="card-description"
                style={{ fontFamily: TYPE, lineHeight: 1.55, color: MUTED, margin: "0 0 var(--space-md)" }}
              >
                {task.description}
              </p>
            )}

            <CensorRule style={{ margin: "0 0 var(--space-md)" }} />

            {inProgressCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                <svg
                  width={17}
                  height={17}
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  style={{ display: "block", flex: "0 0 auto", transform: "rotate(-6deg)" }}
                >
                  <g fill="none" stroke="var(--faction-snide-pink)" strokeWidth="2.6" strokeLinecap="round">
                    <path d="M3.5 3 C8 7.5 12 12 16.5 17.5" />
                    <path d="M16.5 3.5 C12.5 7 8 12 3 16.5" />
                  </g>
                </svg>
                <span style={{ fontFamily: TYPE, fontSize: "var(--text-xl)", letterSpacing: "0.06em", color: MUTED }}>
                  {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Sprayed acid on black (#2035), 15.6:1; nothing lands on the label.
            The opaque ring is load-bearing: at night the button is black on a
            black card. `box-shadow`, not `border`, so the 44px box holds. */}
        {cta && (
          <div style={{ ...CARD_CTA_ROW, position: "relative", zIndex: 2 }}>
            {/* Shared with `SnideTaskDetail` (#2642); add nothing here. */}
            <CardCtaControl cta={cta} style={SNIDE_CARD_CTA}>
              {cta.label}
            </CardCtaControl>
          </div>
        )}
      </article>
    </div>
  );
}
