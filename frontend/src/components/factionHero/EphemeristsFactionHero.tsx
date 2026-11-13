import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import EphemeristsNotationBand from "../factionMarks/EphemeristsNotationBand";
import EphemeristsGloss from "../factionMarks/EphemeristsGloss";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";
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
  SMALL_CAPS,
} from "../factionMarks/ephemeristsPlate";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * Ephemerists faction hero (#1208): the plate's cornice masthead at page width.
 * Night band + survey graticule, octagon emblem, wordmark + notation band, motto
 * cartouche, side stat ledger, cornice.
 *
 * Every ink sits on the non-flipping band: `band-ink` 7.6:1, `gold` 13.4,
 * `band-quiet` 8.6 (#2367). `brass-light` flips but only draws 0.6px hairlines.
 * `nile` / `ochre` fail (2.3 / 2.6) here and are not used.
 */
function HeroGrids() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
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
    </div>
  );
}

export default function EphemeristsFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  /* Captions are glossed via the frame's `key`; figures stay Western numerals
     (#2148, #2997). */
  const stats = heroCounts(i18n.t("feed:factionHero.ephemerists.stats.members", { count: members }), {
    members,
    tasks,
    praxes,
  });
  return (
    <header
      style={{ ...factionBodyVars("ephemerists"),
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
          <HeroKicker
            style={{
              ...SMALL_CAPS,
              fontSize: "var(--text-base)",
              letterSpacing: "0.28em",
              color: GOLD,
              marginBottom: "var(--space-sm)",
            }}
          >
            {i18n.t("feed:factionHero.ephemerists.eyebrow")}
          </HeroKicker>
          <HeroWordmark
            style={{
              fontFamily: DECO,
              // Cinzel 700 runs 7.324em for EPHEMERISTS (+0.14em track each); inner width is
              // 100vw - 96px (page margin + band padding). The name may wrap at the space.
              fontSize: "min(44px, calc((100vw - 96px) / 9))",
              lineHeight: 1.02,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              margin: 0,
              color: BAND_INK,
            }}
          >
            {name}
          </HeroWordmark>
          {/* Notation band (#2367): a page wears it in its header, a card at
              the CTA. Over the flipping rays by night the ink still reads
              5.4:1. Stable seed, so the row is identical every render. */}
          <EphemeristsNotationBand seed="faction:ephemerists" side="band" />
          <HeroTagline
            slug={slug}
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
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)", alignItems: "center", flex: "0 0 232px", minWidth: 200 }}>
          <HeroMark>
            <EmblemOctagon size={112} />
          </HeroMark>
          {/* `eph-turn-scope`: WCAG 2.2.2 pause scope for the captions' turn. */}
          <HeroCounts
            counts={stats}
            className="eph-turn-scope"
            style={{ alignSelf: "stretch", border: `1px solid ${BRASS}` }}
          >
            {(s, i) => (
              <div
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
                  <EphemeristsGloss word={s.key} english={s.label} ordinal={i} />
                </span>
                <span className="content-title" style={{ fontFamily: DECO, lineHeight: 0.85, color: GOLD }}>
                  {s.value}
                </span>
              </div>
            )}
          </HeroCounts>
        </div>
      </div>
      <Cornice />
    </header>
  );
}
