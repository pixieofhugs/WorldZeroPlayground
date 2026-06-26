import type { FactionHeroProps } from "../../pages/FactionDetail";

/**
 * UA (University of Asthmatics) faction-page hero — a gilt-salon frontispiece.
 * The masthead reads as an art-academy museum plate: a gold museum frame
 * (--ua-gilt) around a parchment field, a heraldic crest, a regal serif
 * wordmark, a Latin motto cartouche, and the three counts engraved as salon
 * regalia (patrons / commissions / acquisitions). Ported from the UA design kit
 * (UATaskDetail hero / ua.css); conforms to {@link FactionHeroProps}.
 *
 * UA is ALWAYS LIGHT: its --faction-ua-* / --ua-* tokens are identical in both
 * themes, so the salon styles itself with them and never dims — it does not
 * mutate data-theme.
 *
 * The page passes raw counts; the salon labels them in its own regal voice.
 * Motto + full name are faction constants (not backend fields).
 */

const FULL_NAME = "University of Asthmatics";
const MOTTO = "Ars Longa · Spiritus Brevis";

// Token shorthands — every value resolves to a --ua-* / --faction-ua-* var.
const GILT = "var(--ua-gilt)";
const PAPER = "var(--faction-ua-card-bg)"; // parchment sheet
const PAPER_WARM = "var(--ua-paper-warm)";
const INK = "var(--faction-ua-card-text)"; // brown ink — all text
const ACCENT = "var(--faction-ua-card-accent)"; // burnt amber
const SUB = "var(--faction-ua-card-muted)"; // secondary serif
const MUTED = "var(--ua-muted)"; // mono / metadata labels
const GOLD = "var(--ua-gold)";
const GOLD_LT = "var(--ua-gold-lt)";
const GOLD_PALE = "var(--ua-gold-pale)";
const LINE = "var(--ua-line)"; // hairline borders

// Regal serif faces. The display face is the UA card-font token (a loaded
// serif); engraved regalia labels fall back to Georgia serif.
const DISPLAY = "var(--faction-ua-card-font)";
const ENGRAVED = '"Marcellus", Georgia, serif';

// color-mix helper for shades with no dedicated token.
const ink = (pct: number): string =>
  `color-mix(in srgb, ${INK} ${pct}%, transparent)`;

/** Heraldic crest — a shield with a rising sun and crossed brushes. */
function UACrest({ width, height }: { width: number; height: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 120"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <clipPath id="ua-hero-shield">
          <path d="M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#ua-hero-shield)">
        <rect x="0" y="0" width="100" height="120" fill={ACCENT} />
        <rect x="0" y="60" width="100" height="60" fill={PAPER_WARM} />
        <circle cx="50" cy="60" r="15" fill={GOLD_LT} />
        <g stroke={GOLD_LT} strokeWidth="2.4" strokeLinecap="round">
          <line x1="50" y1="60" x2="50" y2="20" />
          <line x1="50" y1="60" x2="22" y2="30" />
          <line x1="50" y1="60" x2="78" y2="30" />
          <line x1="50" y1="60" x2="14" y2="48" />
          <line x1="50" y1="60" x2="86" y2="48" />
          <line x1="50" y1="60" x2="34" y2="22" />
          <line x1="50" y1="60" x2="66" y2="22" />
        </g>
        <g transform="translate(50 84)">
          <g transform="rotate(38)">
            <rect x="-2" y="-30" width="4" height="44" rx="1.5" fill={INK} />
            <rect x="-3" y="10" width="6" height="6" fill={GOLD_PALE} />
            <path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill={ACCENT} />
          </g>
          <g transform="rotate(-38)">
            <rect x="-2" y="-30" width="4" height="44" rx="1.5" fill={GOLD} />
            <rect x="-3" y="10" width="6" height="6" fill={GOLD_PALE} />
            <path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill={GOLD_LT} />
          </g>
        </g>
      </g>
      <path
        d="M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z"
        fill="none"
        stroke={GOLD_LT}
        strokeWidth="2.5"
      />
      <path
        d="M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z"
        fill="none"
        stroke={INK}
        strokeWidth="0.8"
      />
    </svg>
  );
}

export default function UAFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // The salon engraves its own counts — page passes raw numbers only.
  const stats = [
    { value: members, label: "patrons" },
    { value: tasks, label: "commissions" },
    { value: praxes, label: "acquisitions" },
  ];

  return (
    <header style={{ marginBottom: 32 }}>
      {/* gilt museum frame — outer leaf */}
      <div
        style={{
          padding: 11,
          background: GILT,
          boxShadow:
            "0 18px 40px rgba(60,40,10,0.28), inset 0 0 0 1px rgba(255,255,255,0.45)",
        }}
      >
        {/* inner gold leaf */}
        <div
          style={{
            padding: 5,
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})`,
          }}
        >
          {/* parchment plate */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: `1px solid ${ink(45)}`,
              background: PAPER,
              backgroundImage: `radial-gradient(${ink(3)} 1px, transparent 1px)`,
              backgroundSize: "5px 5px",
              padding: "34px 38px 30px",
              display: "flex",
              gap: 30,
              alignItems: "center",
            }}
          >
            <UACrest width={150} height={180} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* engraved house line */}
              <div
                style={{
                  fontFamily: ENGRAVED,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: ACCENT,
                  marginBottom: 3,
                }}
              >
                {FULL_NAME}
              </div>
              {/* eyebrow — engraved metadata */}
              <div
                style={{
                  fontFamily: ENGRAVED,
                  fontSize: 8,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginBottom: 14,
                }}
              >
                World Zero · The Salon · Est · MMXX
              </div>

              {/* regal wordmark */}
              <h1
                style={{
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: 54,
                  lineHeight: 1.04,
                  letterSpacing: "0.01em",
                  margin: "0 0 16px",
                  color: INK,
                  overflowWrap: "anywhere",
                }}
              >
                {name}
              </h1>

              {/* motto cartouche */}
              <div
                style={{
                  position: "relative",
                  width: "fit-content",
                  background: ACCENT,
                  color: PAPER_WARM,
                  fontFamily: ENGRAVED,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  padding: "5px 26px",
                  clipPath:
                    "polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)",
                  marginBottom: 18,
                }}
              >
                {MOTTO}
              </div>

              {/* statement */}
              <p
                style={{
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: SUB,
                  maxWidth: 560,
                  margin: "0 0 22px",
                }}
              >
                {description ??
                  "Any medium, any madness. The Salon decides what endures."}
              </p>

              {/* engraved regalia plaques */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {stats.map((s) => (
                  <div
                    key={s.label}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      padding: "9px 18px",
                      border: `1px solid ${LINE}`,
                      background: PAPER,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: DISPLAY,
                        fontStyle: "italic",
                        fontWeight: 700,
                        fontSize: 26,
                        lineHeight: 0.9,
                        color: INK,
                      }}
                    >
                      {s.value}
                    </span>
                    <span
                      style={{
                        fontFamily: ENGRAVED,
                        fontSize: 8,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: MUTED,
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
