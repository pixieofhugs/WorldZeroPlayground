import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardProps } from "./TaskCard";
import { CARD_CTA } from "./cardCta";
import { CardCtaControl } from "./CardCtaControl";
import { taskCardSignupCta } from "./signupAffordance";
import i18n from "../../i18n";
import { isNeutralMultiplier } from "../../utils/points";
import { useFormFactor } from "../../hooks/useFormFactor";
import DefaultPointsRing from "../factionMarks/DefaultPointsRing";

/**
 * DefaultTaskCard — THE SPECTRUM SHEET. The task-card archetype for the
 * UNAFFILIATED / no-faction (`na`) state, and the fallback for any task whose
 * faction has no bespoke card yet. `na` ≡ Default is one identity: this IS the
 * unaffiliated kit, not a generic neutral.
 *
 * Where each faction commits to one loud archetype, the unaffiliated card stays
 * deliberately un-committed — a clean sheet ruled by the full spectrum, because
 * every path is still open. The rainbow appears in exactly three places: the
 * 3px band that IS the card's border, the conic ring the marks sit inside, and
 * the tick beside the in-progress count. Lora italic carries the title, Courier
 * Prime everything else.
 *
 * ONE RESPONSIVE COMPONENT (ADR-0056): `useFormFactor` picks the size set, not
 * a different card. There is no mobile twin: ADR-0056 was accepted and the
 * `mobileTaskCard` surface retired, so this file serves both form factors.
 *
 * All colour via `--faction-default-*` tokens — no hardcoded hex (CLAUDE.md);
 * light/dark flips through the `[data-theme="dark"]` cascade, never a ternary.
 */

const MONO = "var(--font-body)";
/**
 * Lora, via the shared display token — deliberately NOT
 * `--faction-default-card-font`, which is Bebas Neue: the face #839 chose for
 * the unaffiliated PRAXIS card. The v2 task-card design names Lora + Courier
 * Prime for this surface. If na should carry one display face everywhere, the
 * fix is repointing that token in index.css, not branching here.
 */
const LORA = "var(--font-display)";

interface SizeSet {
  /** Card width. Geometry, so a raw px number (WORLD_ZERO_STYLE §4a). */
  cardWidth: number;
  /** Outer diameter of the conic points ring. Geometry. */
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
    cardWidth: 340,
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
  color: "var(--faction-default-card-muted)",
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
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          // The spectrum IS the border: a transparent 3px frame with the
          // rainbow painted into the border box behind it, and the sheet
          // painted into the padding box on top.
          border: "3px solid transparent",
          borderRadius: 14,
          backgroundImage:
            "linear-gradient(var(--faction-default-card-bg), var(--faction-default-card-bg)), var(--faction-default-rainbow)",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
          boxShadow: "0 12px 32px -14px var(--color-cast-shadow)",
          color: "var(--faction-default-card-text)",
          fontFamily: MONO,
          padding: size.pad,
        }}
      >
        {/* Everything but the CTA reads the full call — a card-sized target
            that stays valid HTML (no <button> nested in an <a>). */}
        <Link
          to={`/tasks/${task.id}`}
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          {/* Hero — level, a hairline, the marks in their ring, the modifier.
              #1020's uniform "Task {id}" eyebrow sat above this row until #1124
              retired the id from every card, taking the whole eyebrow with it:
              the ordinal was the only thing in it. */}
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

            {/* The points in their spectrum ring — the unaffiliated points mark,
                and since #2042 a shared one: the praxis-card score stamp mounts
                the same ring for its total instead of the struck disc it drew
                before. The ring is drawn ONCE, in {@link DefaultPointsRing}. */}
            <DefaultPointsRing
              value={basePoints}
              unit={i18n.t("feed:taskCard.pointsUnit", { count: basePoints })}
              size={size.ringSize}
              valueSize={size.numeralSize}
            />

            {/* Faction modifier — hidden at ×1.00, so invisible under era_1's
                neutralized modifiers and automatic the day one moves
                (ADR-0055). */}
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
                    background: "var(--faction-default-card-text)",
                    color: "var(--faction-default-card-bg)",
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
                color: "var(--faction-default-card-muted)",
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
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: "var(--faction-default-rainbow)",
                  display: "inline-block",
                  flex: "none",
                }}
              />
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.04em",
                  color: "var(--faction-default-card-muted)",
                }}
              >
                {i18n.t("feed:taskCard.inProgress", { count: inProgressCount })}
              </span>
            </div>
          )}
        </Link>

        {cta && (
          <>
            {/* The spectrum, one hairline thick, closing the sheet off from the
                sign-up (#2030). The FOURTH place the rainbow appears on this
                card, and the quietest — 0.6 of it, so it rules rather than
                repeats the 3px border. Albescent draws the same line fainter
                still; the opacity is a custom property so that stays a cascade
                and not a prop (index.css, `.alb-task`). */}
            <div
              aria-hidden="true"
              data-cta-rule="default"
              style={{
                height: 1,
                background: "var(--faction-default-rainbow)",
                opacity: "var(--faction-default-cta-rule-opacity, 0.6)",
                margin: "0 0 var(--space-lg)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <CardCtaControl
                cta={cta}
                style={{
                  ...CARD_CTA,
                  cursor: cta.denied ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: LORA,
                  fontWeight: 600,
                  fontSize: "var(--text-xl)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "var(--space-md) var(--space-2xl)",
                  borderRadius: 11,
                  color: "var(--faction-default-card-text)",
                  background: "transparent",
                  border:
                    "1px solid color-mix(in srgb, var(--faction-default-card-accent) 35%, transparent)",
                }}
              >
                {cta.label}
              </CardCtaControl>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
