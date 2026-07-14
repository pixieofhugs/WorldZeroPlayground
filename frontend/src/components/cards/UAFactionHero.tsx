import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { UACrest, MottoRibbon } from "./UACrest";

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

// Token shorthands — every value resolves to a --ua-* / --faction-ua-* var.
const GILT = "var(--ua-gilt)";
const PAPER = "var(--faction-ua-card-bg)"; // parchment sheet
const INK = "var(--faction-ua-card-text)"; // brown ink — all text
const ACCENT = "var(--faction-ua-card-accent)"; // burnt amber
const SUB = "var(--faction-ua-card-muted)"; // secondary serif
const MUTED = "var(--ua-muted)"; // mono / metadata labels
const GOLD = "var(--ua-gold)";
const GOLD_PALE = "var(--ua-gold-pale)";
const LINE = "var(--ua-line)"; // hairline borders

// Regal serif faces. The display face is the UA card-font token (a loaded
// serif); engraved regalia labels fall back to Georgia serif.
const DISPLAY = "var(--faction-ua-card-font)";
const ENGRAVED = '"Marcellus", Georgia, serif';

// color-mix helper for shades with no dedicated token.
const ink = (pct: number): string =>
  `color-mix(in srgb, ${INK} ${pct}%, transparent)`;

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
              flexWrap: "wrap",
              gap: 30,
              alignItems: "center",
            }}
          >
            <UACrest width={150} height={180} />

            <div style={{ flex: 1, minWidth: 260 }}>
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
                {i18n.t("feed:identity.ua.fullName")}
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
                {i18n.t("feed:factionHero.ua.eyebrow")}
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
              <div style={{ marginBottom: 18 }}>
                <MottoRibbon />
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
                  i18n.t("feed:factionHero.ua.descriptionFallback")}
              </p>

            </div>

            {/* stats on the side — engraved regalia stacked in a side column */}
            <div style={{ flexShrink: 0, width: 168, display: "flex", flexDirection: "column", gap: 11 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderTop: `1px solid ${LINE}`,
                    paddingTop: 9,
                  }}
                >
                  <span
                    style={{
                      fontFamily: ENGRAVED,
                      fontSize: 8.5,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: MUTED,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontFamily: DISPLAY,
                      fontStyle: "italic",
                      fontWeight: 700,
                      fontSize: 23,
                      lineHeight: 1,
                      color: ACCENT,
                    }}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
