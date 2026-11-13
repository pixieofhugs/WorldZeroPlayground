import type { FactionHeroProps } from "../../pages/FactionDetail";
import i18n from "../../i18n";
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  DEEP,
  DISPLAY,
  GOLD,
  HAND,
  INK,
  READING,
  SHADOW,
  SLIP_SHEET,
  Spark,
} from "../factionMarks/covenSlip";
import { CovenSigil } from "../sigil/CovenSigil";
import { HeroCounts, HeroKicker, HeroMark, HeroTagline, HeroWordmark, heroCounts } from "./heroFrame";
import { factionBodyVars } from "../../utils/factionBodyFace"

/**
 * Cozy Coven faction hero, the spell slip (#1209): witch hat, Caveat wordmark,
 * braid, counts as candle-lit panels in a side column (never a full-width band).
 * No blurb: `CovenFactionBody` sets it as the manifesto (#2137).
 */
export default function CovenFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // Only `members` is named here; the frame owns the rest (#2997).
  // ponytail: three counts; add seasonRank / points-won panels once an
  // aggregate endpoint exists.
  const stats = heroCounts(i18n.t("feed:factionHero.coven.stats.members", { count: members }), {
    members,
    tasks,
    praxes,
  });

  return (
    <header style={{ ...factionBodyVars("coven"), marginBottom: "var(--space-2xl)" }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xl)",
          flexWrap: "wrap",
          background: SLIP_SHEET,
          border: `2px solid ${BORDER}`,
          borderRadius: 18,
          padding: "var(--space-xl)",
          boxShadow: SHADOW,
          color: INK,
          overflow: "hidden",
        }}
      >
        {/* Flat silhouette at 74px is accepted (#2726); don't re-draw the
            retired pentagram here. */}
        <HeroMark>
          <CovenSigil size={74} color={DEEP} />
        </HeroMark>

        <div style={{ flex: 1, minWidth: 250 }}>
          <HeroKicker style={CAPTION}>{i18n.t("feed:factionHero.coven.eyebrow")}</HeroKicker>
          <HeroWordmark
            style={{
              fontFamily: HAND,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat wordmark — the slip's masthead, not typeset copy.
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 0.9,
              margin: "var(--space-xs) 0 0",
              color: INK,
            }}
          >
            {name}
          </HeroWordmark>
          <Braid style={{ margin: "var(--space-sm) 0" }} />
          <HeroTagline
            slug={slug}
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: "var(--text-title)",
              letterSpacing: "0.02em",
              color: INK,
            }}
          />
        </div>

        <HeroCounts
          counts={stats}
          style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}
        >
          {(stat) => (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                background: CARD,
                border: `1.5px solid ${BORDER}`,
                borderRadius: 12,
                padding: "var(--space-xs) var(--space-md)",
              }}
            >
              <Spark size={14} color={GOLD} />
              {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the panel's numeral, set to the mark beside it rather than the type ramp. */}
              <span style={{ fontFamily: READING, fontSize: 28, lineHeight: 1, color: DEEP }}>
                {stat.value}
              </span>
              <span style={{ ...CAPTION, fontSize: "var(--text-md)", width: 66 }}>{stat.label}</span>
            </div>
          )}
        </HeroCounts>
      </div>
    </header>
  );
}
