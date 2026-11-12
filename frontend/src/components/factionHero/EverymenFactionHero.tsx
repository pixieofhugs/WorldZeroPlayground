import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import { EverymenSigil } from "../sigil/EverymenSigil";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * Everymen faction hero, a union poster: sunburst red field, halftone, cog seal,
 * knockout Bebas wordmark, motto plate, side ledger (never a full-width band).
 */

const FIELD = "var(--everymen-field)";
const CREAM = "var(--everymen-cream)";
const GOLD = "var(--everymen-gold)";
const INK = "var(--everymen-ink)";
const RED = "var(--everymen-red)";

export default function EverymenFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // Only `members` is named here; the frame owns the rest (#2997).
  // ponytail: three counts; add seasonRank / points rows once an aggregate
  // endpoint exists.
  const stats = heroCounts(i18n.t("feed:factionHero.everymen.stats.members", { count: members }), {
    members,
    tasks,
    praxes,
  });

  return (
    <header
      style={{ ...factionBodyVars("everymen"),
        position: "relative",
        overflow: "hidden",
        marginBottom: "var(--space-2xl)",
        border: `3px solid ${INK}`,
        background: FIELD,
        color: CREAM,
        boxShadow: "8px 10px 0 color-mix(in srgb, var(--everymen-ink) 35%, transparent)",
      }}
    >
      {/* The shared burst (#2195); `knockout` because paper ray ink vanishes
          on red. */}
      <div aria-hidden="true" className="em-burst em-burst-knockout" />
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
        <div
          style={{
            flex: 1,
            minWidth: 300,
            display: "flex",
            alignItems: "center",
            // On a phone the seal stands above the name (#2000).
            flexWrap: "wrap",
            gap: "var(--space-2xl)",
            padding: "var(--space-2xl) var(--space-3xl) var(--space-2xl)",
          }}
        >
          <HeroMark>
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
          </HeroMark>

          {/* 240 ≈ the wordmark's ~215px need at 76px, so the row wraps
              instead of breaking mid-word; `min(…, 100%)` stops overflow on a
              phone (#1314). */}
          <div style={{ flex: 1, minWidth: "min(240px, 100%)" }}>
            <HeroKicker
              style={{
                fontFamily: "var(--faction-everymen-body-font)",
                fontSize: "var(--text-base)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: GOLD,
                marginBottom: "var(--space-xs)",
              }}
            >
              {i18n.t("feed:factionHero.everymen.eyebrow")}
            </HeroKicker>
            <HeroWordmark
              style={{
                fontFamily: "var(--font-accent)",
                // Scales rather than breaks (#2000); 20vw bites below ~380px.
                // Ornament, off the type scale; no lint disable needed, as the
                // ratchet doesn't look inside `min()`.
                fontSize: "min(76px, 20vw)",
                lineHeight: 0.82,
                letterSpacing: "0.01em",
                margin: 0,
                color: CREAM,
                textShadow: `3px 3px 0 ${INK}`,
              }}
            >
              {name}
            </HeroWordmark>
            <HeroTagline
              slug={slug}
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
            />
          </div>
        </div>

        <HeroCounts
          counts={stats}
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
          {(s) => (
            <div
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
                  fontFamily: "var(--faction-everymen-body-font)",
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
          )}
        </HeroCounts>
      </div>
    </header>
  );
}
