import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { EverymenSigil } from "../sigil/EverymenSigil";

/**
 * The Everymen faction-page hero — a union masthead poster. A sunburst red
 * field under a halftone wash, a cog seal, a knockout Bebas wordmark with an
 * ink drop-shadow, a motto plate, and — per the faction-page standardization —
 * a side "ledger" stat panel (stats live on the side of the hero, never a
 * full-width band). Ported from the Everymen design kit; conforms to
 * {@link FactionHeroProps}.
 *
 * Theme-aware through the cascade — the --everymen-* tokens already carry
 * light + dark values, so the masthead never mutates the global theme.
 *
 * The page passes raw counts; the faction labels them in its own union voice.
 * Motto is a faction constant (not a backend field).
 */

const FIELD = "var(--everymen-field)";
const CREAM = "var(--everymen-cream)";
const GOLD = "var(--everymen-gold)";
const INK = "var(--everymen-ink)";
const RED = "var(--everymen-red)";

export default function EverymenFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // The faction labels its own counts — page passes raw numbers only.
  // ponytail: three real counts. seasonRank / total-points-awarded aren't
  // sourced yet (no leaderboard/aggregate endpoint) — add rows when they are.
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.everymen.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];

  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-2xl)",
        border: `3px solid ${INK}`,
        background: FIELD,
        color: CREAM,
        boxShadow: "8px 10px 0 color-mix(in srgb, var(--everymen-ink) 35%, transparent)",
      }}
    >
      {/* sunburst rays from the upper-left */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.5,
          background:
            "repeating-conic-gradient(from 0deg at 22% 38%, var(--everymen-field-deep) 0deg 8deg, transparent 8deg 16deg)",
        }}
      />
      {/* halftone dot wash */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.08,
          backgroundImage: `radial-gradient(${CREAM} 0.6px, transparent 0.7px)`,
          backgroundSize: "5px 5px",
        }}
      />
      {/* gold hairline */}
      <div style={{ height: 5, background: GOLD, position: "relative", zIndex: 2 }} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        {/* identity — cog seal + wordmark + motto + blurb */}
        <div
          style={{
            flex: 1,
            minWidth: 300,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2xl)",
            padding: "var(--space-2xl) var(--space-3xl) var(--space-2xl)",
          }}
        >
          {/* cog seal */}
          <div
            style={{
              flexShrink: 0,
              width: 116,
              height: 116,
              borderRadius: "50%",
              background: CREAM,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 0 4px ${INK}, inset 0 0 0 6px ${RED}`,
            }}
          >
            <EverymenSigil size={58} color={RED} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: GOLD,
                marginBottom: "var(--space-xs)",
              }}
            >
              {i18n.t("feed:factionHero.everymen.eyebrow")}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-accent)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: union-poster wordmark — accent face at 0.82 leading, hard drop shadow
                fontSize: 76,
                lineHeight: 0.82,
                letterSpacing: "0.01em",
                margin: 0,
                color: CREAM,
                textShadow: `3px 3px 0 ${INK}`,
                overflowWrap: "anywhere",
              }}
            >
              {name}
            </h1>
            <div
              style={{
                display: "inline-block",
                marginTop: "var(--space-md)",
                background: INK,
                color: GOLD,
                fontFamily: "var(--font-accent)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: struck motto plaque — poster type set to the ink block
                fontSize: 17,
                letterSpacing: "0.18em",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: inset of the motto on its struck ink plaque; rounding reflows the plaque.
                padding: "4px 14px",
              }}
            >
              {i18n.t("feed:factionHero.everymen.motto")}
            </div>
            <p
              className="content-text"
              style={{
                fontFamily: "var(--font-body)",
                lineHeight: 1.6,
                maxWidth: 560,
                margin: "var(--space-md) 0 0",
                color: CREAM,
              }}
            >
              {description ?? i18n.t("feed:factionHero.everymen.descriptionFallback")}
            </p>
          </div>
        </div>

        {/* stats on the side — dark ledger panel */}
        <div
          style={{
            flexShrink: 0,
            width: 238,
            background: INK,
            borderLeft: `2px solid ${GOLD}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "var(--space-lg) var(--space-xl)",
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "var(--space-md)",
                padding: "var(--space-md) 0",
                borderBottom: "1px solid color-mix(in srgb, var(--everymen-gold) 22%, transparent)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: CREAM,
                  opacity: 0.85,
                }}
              >
                {s.label}
              </span>
              {/* eslint-disable-next-line local/no-raw-style-values -- ornament: ledger numeral in the poster face, sized to its cap-height; above the floor already */}
              <span style={{ fontFamily: "var(--font-accent)", fontSize: 34, lineHeight: 0.8, color: GOLD }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
