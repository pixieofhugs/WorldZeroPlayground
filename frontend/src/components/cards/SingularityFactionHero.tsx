import { Trans } from "react-i18next";
import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";

/**
 * Singularity faction-page hero — a terminal boot-sequence frontispiece. The
 * masthead reads as the faction initializing itself: a phosphor-green/blue
 * printout on a terminal-black field, framed by an inset signal border,
 * scanlines, a corner phosphor glow, and a slow-spinning sigil. Ported from the
 * Singularity design kit (SgHero); conforms to {@link FactionHeroProps}.
 *
 * Singularity is ALWAYS DARK: its --faction-singularity-* tokens are identical
 * in both themes, so the container styles itself with them and reads as a
 * terminal regardless of the global theme — it never mutates data-theme.
 *
 * The page passes raw counts; the faction labels them in its own terminal
 * voice. Motto + boot lines are faction constants (not backend fields).
 */

// Token shorthands — every color resolves to a --faction-singularity-* var.
const VOID = "var(--faction-singularity-card-bg)"; // terminal black
const PHOSPHOR = "var(--faction-singularity-card-accent)"; // green
const PHOSPHOR_TEXT = "var(--faction-singularity-card-text)"; // green
const SIGNAL = "var(--faction-singularity-card-muted)"; // blue
const BORDER = "var(--faction-singularity-border)";
const BORDER_HARD = "var(--faction-singularity-border-hard)";
const FONT = "var(--font-faction-terminal)";

// color-mix helpers for shades that have no dedicated token.
const phosphor = (pct: number): string =>
  `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`;
const signal = (pct: number): string =>
  `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`;
const signalFill = "var(--faction-singularity)"; // blue brand fill

/** Minimal phosphor sigil — three concentric rings around a node. */
function SingularityMark({
  size,
  color,
}: {
  size: number;
  color: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <g fill="none" stroke={color} strokeWidth="1.5">
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="30" strokeDasharray="3 5" />
        <circle cx="50" cy="50" r="14" />
      </g>
      <circle cx="50" cy="50" r="4" fill={color} />
    </svg>
  );
}

export default function SingularityFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // The faction labels its own counts — page passes raw numbers only. Per the
  // standardization rule these sit in a side "system readout" column beside the
  // sigil, never a full-width band under the blurb.
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.singularity.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.singularity.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.singularity.stats.praxes") },
  ];

  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: 32,
        border: `1px solid ${BORDER_HARD}`,
        background: VOID,
        color: PHOSPHOR_TEXT,
        fontFamily: FONT,
        boxShadow: "0 24px 60px -28px rgba(0,0,0,0.8)",
      }}
    >
      {/* inset signal border */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 6,
          border: `1px solid ${signal(18)}`,
          pointerEvents: "none",
          zIndex: 3,
        }}
      />
      {/* scanlines */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(to bottom,transparent,transparent 2px,rgba(255,255,255,0.018) 2px,rgba(255,255,255,0.018) 4px)",
        }}
      />
      {/* corner phosphor glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${phosphor(12)}, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "36px 40px 40px",
          display: "grid",
          gridTemplateColumns: "1fr 240px",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div>
          {/* boot lines */}
          <div
            style={{
              fontSize: 8.5,
              letterSpacing: "0.18em",
              color: signal(55),
              marginBottom: 14,
              lineHeight: 1.9,
            }}
          >
            <div>{">"} {i18n.t("feed:factionHero.singularity.boot.faction", { name: name.toUpperCase() })}</div>
            <div>{">"} {i18n.t("feed:factionHero.singularity.boot.status")}</div>
            <div>
              {">"}{" "}
              <Trans
                ns="feed"
                i18nKey="factionHero.singularity.boot.threshold"
                components={{ 1: <span style={{ color: PHOSPHOR }} /> }}
              />
            </div>
          </div>

          {/* name */}
          <h1
            style={{
              fontFamily: FONT,
              fontSize: 56,
              lineHeight: 0.9,
              letterSpacing: "0.04em",
              margin: "0 0 12px",
              color: PHOSPHOR,
              fontWeight: 400,
            }}
          >
            {name}
          </h1>

          {/* motto */}
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.28em",
              color: signal(70),
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {i18n.t("feed:factionHero.singularity.motto")}
          </div>

          {/* blurb */}
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.7,
              color: phosphor(60),
              maxWidth: 520,
              margin: 0,
            }}
          >
            {description ??
              i18n.t("feed:factionHero.singularity.descriptionFallback")}
          </p>
        </div>

        {/* right column: spinning sigil + side "system readout" stats */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0, width: 120, height: 120 }}>
            <div
              aria-hidden="true"
              className="sg-pulse"
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${phosphor(28)}, transparent 70%)`,
                opacity: 0.2,
                pointerEvents: "none",
              }}
            />
            <div className="sg-rotate">
              <SingularityMark size={120} color={phosphor(55)} />
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SingularityMark size={44} color={PHOSPHOR} />
            </div>
          </div>

          {/* system readout — stats stacked in a side panel */}
          <div
            style={{
              alignSelf: "stretch",
              border: `1px solid ${BORDER}`,
              background: "var(--faction-singularity-light)",
            }}
          >
            <div
              style={{
                fontSize: 7,
                letterSpacing: "0.2em",
                color: signal(55),
                textTransform: "uppercase",
                padding: "7px 12px 5px",
                borderBottom: `1px solid ${signal(28)}`,
              }}
            >
              {i18n.t("feed:factionHero.singularity.readoutTitle")}
            </div>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  padding: "7px 12px",
                  borderBottom: `1px solid ${signal(14)}`,
                }}
              >
                <span
                  style={{
                    fontSize: 7.5,
                    letterSpacing: "0.14em",
                    color: signal(50),
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </span>
                <span style={{ fontSize: 20, lineHeight: 1, color: PHOSPHOR }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* signal strip at the foot of the masthead */}
      <div
        aria-hidden="true"
        style={{
          height: 4,
          background: signalFill,
          position: "relative",
          zIndex: 2,
          opacity: 0.7,
        }}
      />
    </header>
  );
}
