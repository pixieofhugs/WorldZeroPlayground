import type { FactionHeroProps } from "../../pages/FactionDetail";

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

const MOTTO = "THE WORK OUTLASTS THE WORKER";

const FIELD = "var(--everymen-field)";
const CREAM = "var(--everymen-cream)";
const GOLD = "var(--everymen-gold)";
const INK = "var(--everymen-ink)";
const RED = "var(--everymen-red)";

/** Union cog seal — a toothed ring around a hub. */
function CogMark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <g fill={color}>
        {[0, 30, 60, 90, 120, 150].map((d) => (
          <rect key={d} x="11" y="0.5" width="2" height="5" rx="0.5" transform={`rotate(${d} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

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
    { value: members, label: "card-carrying" },
    { value: tasks, label: "work orders" },
    { value: praxes, label: "reports filed" },
  ];

  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: 32,
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
            gap: 30,
            padding: "30px 38px 28px",
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
            <CogMark size={58} color={RED} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: GOLD,
                marginBottom: 5,
              }}
            >
              World Zero · Faction
            </div>
            <h1
              style={{
                fontFamily: "var(--font-accent)",
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
                marginTop: 12,
                background: INK,
                color: GOLD,
                fontFamily: "var(--font-accent)",
                fontSize: 17,
                letterSpacing: "0.18em",
                padding: "4px 14px",
              }}
            >
              {MOTTO}
            </div>
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12.5,
                lineHeight: 1.6,
                maxWidth: 560,
                margin: "13px 0 0",
                color: CREAM,
              }}
            >
              {description ?? "Nobody's coming to fix it but us. Report for duty."}
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
            padding: "14px 26px",
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                padding: "11px 0",
                borderBottom: "1px solid color-mix(in srgb, var(--everymen-gold) 22%, transparent)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: CREAM,
                  opacity: 0.85,
                }}
              >
                {s.label}
              </span>
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
