import { Trans } from "react-i18next";
import i18n from "../../i18n";
import {
  BAND,
  BAND_INK,
  BAND_QUIET,
  BRASS,
  BRASS_LIGHT,
  Cornice,
  DECO,
  EmblemOctagon,
  GOLD,
  GRID,
  GlyphRegister,
  MARGINALIA,
  READING,
  SMALL_CAPS,
} from "../factionMarks/ephemeristsPlate";

/**
 * The Ephemerists faction-page hero — the plate's CORNICE MASTHEAD at page width
 * (#1208, swept off the illuminated codex). The night band behind two incised
 * glyph registers and a ghost survey graticule, the emblem struck in a stepped
 * octagon, a letterspaced Poiret One wordmark, the motto on a ruled cartouche, a
 * running gloss, and a brass-ruled stat ledger on the side. The cavetto cornice
 * closes it, exactly as it closes the masthead on the task detail.
 *
 * Every ink is measured on the BAND, which is the only ground here: `band-ink`
 * 12.4:1, `gold` 9.4, `band-quiet` 8.6, `brass-light` 6.1. `nile` and `ochre`
 * are 2.3 and 2.6 on this ground and appear nowhere — the codex's lapis
 * last-word tic went with them (see `EphemeristsCard`).
 *
 * Takes raw counts and labels them in the faction's own voice — the page stays
 * vocabulary-agnostic (see FactionHeroProps in FactionDetail).
 */
function HeroGrids() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          // The graticule is the published token now (#1635) — this hero is
          // where it was drawn, and it is the first thing to borrow it back.
          backgroundImage: GRID,
        }}
      />
      <svg viewBox="0 0 1000 320" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.16 }}>
        <g stroke={BRASS_LIGHT} strokeWidth="0.6" fill="none">
          {Array.from({ length: 21 }).map((_, i) => (
            <line key={i} x1={i * 50} y1="320" x2="820" y2="20" />
          ))}
        </g>
      </svg>
      {/* The design's own register, marching the band rather than a card's. */}
      <svg width="100%" height={26} viewBox="0 0 1000 26" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", left: 0, top: 8, opacity: 0.6 }}>
        <GlyphRegister width={1000} y={13} strength={0.34} keyPrefix="hero-a" />
      </svg>
      <svg width="100%" height={26} viewBox="0 0 1000 26" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", left: 0, bottom: 6, opacity: 0.6 }}>
        <GlyphRegister width={1000} y={13} strength={0.3} keyPrefix="hero-b" />
      </svg>
    </div>
  );
}

export default function EphemeristsFactionHero({
  name,
  members,
  tasks,
  praxes,
}: {
  name: string;
  members: number;
  tasks: number;
  praxes: number;
}) {
  // The faction labels its own counts — page passes raw numbers only.
  const stats = [
    { value: members, label: i18n.t("feed:factionHero.ephemerists.stats.members") },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks") },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes") },
  ];
  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-xl)",
        background: BAND,
        color: BAND_INK,
      }}
    >
      <HeroGrids />
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--space-2xl)", padding: "var(--space-2xl)", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", minWidth: 220 }}>
          <div
            style={{
              ...SMALL_CAPS,
              fontSize: "var(--text-base)",
              letterSpacing: "0.28em",
              color: GOLD,
              marginBottom: "var(--space-sm)",
            }}
          >
            {i18n.t("feed:factionHero.ephemerists.eyebrow")}
          </div>
          <h1
            style={{
              fontFamily: DECO,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the masthead wordmark — Poiret One letterspaced until the width is the mark
              fontSize: 44,
              lineHeight: 1.02,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              margin: 0,
              color: BAND_INK,
            }}
          >
            {name}
          </h1>
          <div
            style={{
              display: "inline-block",
              marginTop: "var(--space-md)",
              ...SMALL_CAPS,
              fontSize: "var(--text-xl)",
              letterSpacing: "0.26em",
              color: GOLD,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the motto's inset inside its ruled cartouche; rounding reflows the rule.
              padding: "5px 16px",
              border: `1px solid ${BRASS}`,
            }}
          >
            {i18n.t("feed:factionHero.ephemerists.motto")}
          </div>
          <p
            className="content-text"
            style={{
              fontFamily: READING,
              lineHeight: 1.7,
              maxWidth: 580,
              margin: "var(--space-lg) 0 0",
              color: BAND_INK,
            }}
          >
            {/* The catalog blurb used to open this paragraph; #2137 took it out,
                because `EphemeristsFactionBody` sets the same string as the
                apparatus. The paragraph stays as the gloss's mount — it is what
                holds the gloss off the motto. */}
            {/* Gloss is a full catalog sentence -> content floor; the marginalia
                face and the band's second ink carry the hierarchy, not a size. */}
            <span
              className="content-text"
              style={{
                display: "block",
                fontFamily: MARGINALIA,
                fontStyle: "italic",
                color: BAND_QUIET,
                marginTop: "var(--space-sm)",
              }}
            >
              {/* The self-referential gloss is one <Trans> unit; "see †" is tag <1>. */}
              <Trans
                ns="feed"
                i18nKey="factionHero.ephemerists.gloss"
                components={{ 1: <span style={{ color: GOLD }} /> }}
              />
            </span>
          </p>
        </div>

        {/* Right column: emblem + a stat ledger on the side (standardization:
            stats sit beside the emblem, never a full-width band). */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)", alignItems: "center", flex: "0 0 232px", minWidth: 200 }}>
          <EmblemOctagon size={112} />
          <div style={{ alignSelf: "stretch", border: `1px solid ${BRASS}` }}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "var(--space-md)",
                  padding: "var(--space-sm) var(--space-lg)",
                  borderTop: i > 0 ? `1px solid color-mix(in srgb, ${BRASS} 45%, transparent)` : undefined,
                }}
              >
                <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.14em", color: BAND_QUIET }}>
                  {s.label}
                </span>
                <span className="content-title" style={{ fontFamily: DECO, lineHeight: 0.85, color: GOLD }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Cornice />
    </header>
  );
}
