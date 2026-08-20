import { Trans } from "react-i18next";
import i18n from "../../i18n";
import EphemeristsNotationBand from "../factionMarks/EphemeristsNotationBand";
import EphemeristsGloss, { type GlossWord } from "../factionMarks/EphemeristsGloss";
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
  MARGINALIA,
  READING,
  SMALL_CAPS,
} from "../factionMarks/ephemeristsPlate";

/**
 * The Ephemerists faction-page hero — the plate's CORNICE MASTHEAD at page width
 * (#1208, swept off the illuminated codex). The night band behind a ghost survey
 * graticule, the emblem struck in a stepped octagon, a letterspaced Poiret One
 * wordmark closed off by the notation band, the motto on a ruled cartouche, a
 * running gloss, and a brass-ruled stat ledger on the side. The cavetto cornice
 * closes it, exactly as it closes the masthead on the task detail.
 *
 * Every ink is measured on the BAND, which is the only ground here, and the
 * three tokens that make it — `-plate-band`, `-plate-band-ink`,
 * `-plate-brass-rule` — are each declared once and do not flip, so the readings
 * hold in both cascades: `band-ink` 7.6:1, `gold` 13.4, `band-quiet` 8.6
 * (re-measured against today's #12151f in #2367 — the first two were stale by
 * two token moves). `brass-light` is not an ink here at all: it draws the
 * graticule and the survey rays, it is the one thing on this hero that DOES
 * flip, and a 0.6px hairline is not text. `nile` and `ochre` are 2.3 and 2.6 on
 * this ground and appear nowhere — the codex's lapis last-word tic went with
 * them (see `EphemeristsCard`).
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
      {/* TWO INCISED REGISTERS STOOD HERE (#2210), one along the top of the
          band and one along the bottom. They were the OLD glyph vocabulary, and
          #2143's notation band is the faction's only ornament row now. The row
          came back in the new vocabulary (#2367) but NOT to the ground: it is
          the header's own last line, so it is mounted under the wordmark
          below. What the ground keeps is the graticule and the survey rays. */}
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
  /* THE CAPTIONS TRAVEL, THE COUNTS DO NOT (#2148). `gloss` names the catalog
     entry each caption is cast through; the figure beside it stays a Western
     numeral, always. */
  const stats: { value: number; label: string; gloss: GlossWord }[] = [
    { value: members, label: i18n.t("feed:factionHero.ephemerists.stats.members"), gloss: "members" },
    { value: tasks, label: i18n.t("feed:factionHero.stats.tasks"), gloss: "tasks" },
    { value: praxes, label: i18n.t("feed:factionHero.stats.praxes"), gloss: "praxes" },
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
          {/* THE NOTATION BAND, the header's last line (#2367).

              The placement law is PAGE-VERSUS-CARD, not masthead-versus-no-
              masthead: a page carries the band in its header, a card carries it
              at the call to action. This hero is a page and it heads itself, so
              the band sits where the masthead puts its own — directly under the
              wordmark, ruled off in brass, closing the lockup against the motto
              below.

              THE GROUND IS THE SAME GROUND. `side="band"` paints `-plate-band-
              ink` for a `-plate-band` ground, and `-plate-band` is exactly what
              this header is: 7.59:1, and every token in the pairing (band,
              band-ink, brass-rule 3.8:1 as a graphical rule) is declared once
              and does not flip, so the row measures the same in both cascades.
              What the hero adds over the masthead's is the graticule and the
              survey rays, whose `brass-light` DOES flip — by day it is darker
              than the band and lifts nothing; by night the ink still reads 6.2:1
              over the ruling and 5.4:1 over a ray, which is the condition the
              wordmark and the gloss have sat in since #1208.

              Seeded from the surface, and the surface here is the faction page
              itself — one stable string, so the row is the hero's own and comes
              back byte-identical on every render. */}
          <EphemeristsNotationBand seed="faction:ephemerists" side="band" />
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
          {/* `eph-turn-scope` is WCAG 2.2.2's pause mechanism for the captions'
              turn: the stylesheet's rule is a descendant selector, so the ledger
              is the scope rather than each caption carrying a wrapper. */}
          <div className="eph-turn-scope" style={{ alignSelf: "stretch", border: `1px solid ${BRASS}` }}>
            {stats.map((s, i) => (
              <div
                key={s.gloss}
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
                  <EphemeristsGloss word={s.gloss} english={s.label} ordinal={i} />
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
