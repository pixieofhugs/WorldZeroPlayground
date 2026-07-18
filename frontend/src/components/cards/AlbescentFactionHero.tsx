import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import AlbescentSigil from "./AlbescentSigil";

/**
 * Albescent faction-page hero — a still, meditative frontispiece (#232). No
 * chrome, no color: a white cotton-paper sheet, the faction name set large in
 * italic, the surveyor's mark watermarked behind and struck once at the side,
 * and the three counts kept as a quiet ledger. Ported from the Albescent design
 * kit (`AlHero`); conforms to {@link FactionHeroProps}.
 *
 * Always light — every --faction-albescent-* token is identical in both themes,
 * so it never mutates data-theme. All colors via tokens (no hardcoded hex —
 * CLAUDE.md). The page passes raw counts; the order names them in its own voice.
 * Motto is a faction constant, not a backend field.
 */

const INK = "var(--faction-albescent-card-text)";
const SURFACE = "var(--faction-albescent-surface)";
const BORDER = "var(--faction-albescent-border)";
const FONT = "var(--faction-albescent-card-font)"; // Cormorant Garamond
const MONO = "var(--faction-albescent-mono)"; // Courier Prime

const ink = (pct: number): string => `color-mix(in srgb, ${INK} ${pct}%, transparent)`;

export default function AlbescentFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.albescent.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.albescent.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.albescent.stats.praxes") },
  ];

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        marginBottom: "var(--space-xl)",
      }}
    >
      {/* Faint watermark mark, high and to the side. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "68%",
          transform: "translate(-50%,-50%)",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.035,
        }}
      >
        <AlbescentSigil size={220} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "var(--space-2xl)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "var(--space-2xl)",
          alignItems: "center",
        }}
      >
        <div>
          {/* Pre-title eyebrow */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-xs)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: ink(22),
              marginBottom: "var(--space-lg)",
              lineHeight: 1.9,
            }}
          >
            <div>{i18n.t("feed:factionHero.albescent.factionLine", { name })}</div>
            <div>{i18n.t("feed:factionHero.albescent.unrankedLine")}</div>
          </div>

          {/* Faction name */}
          <div
            style={{
              fontFamily: FONT,
              fontStyle: "italic",
              fontWeight: 300,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: vellum wordmark — the Albescent hero's display type
              fontSize: 60,
              lineHeight: 0.94,
              color: INK,
              marginBottom: "var(--space-lg)",
              letterSpacing: "-0.015em",
            }}
          >
            {name}
          </div>

          {/* Motto */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: "var(--text-sm)",
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: ink(28),
              marginBottom: "var(--space-lg)",
            }}
          >
            {i18n.t("feed:factionHero.albescent.motto")}
          </div>

          {/* Blurb — the faction's own description */}
          {description && (
            <p className="content-text" style={{ fontFamily: MONO, lineHeight: 1.74, color: ink(46), maxWidth: 490, marginBottom: "var(--space-xl)" }}>
              {description}
            </p>
          )}

          {/* Stats ledger */}
          <div style={{ display: "flex", gap: "var(--space-xl)", flexWrap: "wrap" }}>
            {stats.map((s) => (
              <div key={s.label} style={{ paddingTop: "var(--space-md)", borderTop: `1px solid ${BORDER}`, minWidth: 80 }}>
                {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ledger numeral in the vellum display face, sized to its cap-height; already above the content floor */}
                <div style={{ fontFamily: FONT, fontStyle: "italic", fontWeight: 300, fontSize: 26, lineHeight: 1, color: ink(68), marginBottom: "var(--space-xs)" }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.2em", textTransform: "uppercase", color: ink(26) }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Struck mark at the side. ponytail: static, not the design's slow
            "breathe" — a decorative keyframe not worth a global @keyframes here. */}
        <div style={{ flexShrink: 0 }}>
          <AlbescentSigil size={96} />
        </div>
      </div>
    </div>
  );
}
