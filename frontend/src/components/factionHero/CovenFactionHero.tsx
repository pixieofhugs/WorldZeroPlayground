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
import { HeroCounts, HeroKicker, HeroWordmark, heroCounts, heroTagline } from "./heroFrame";

/**
 * Cozy Coven faction-page hero — the spell slip, opened out (#1209).
 *
 * The witch hat, the coven's name hand-lettered in Caveat, a braided
 * thread under both, and — per the faction-page standardization — the three
 * counts as small candle-lit panels in a SIDE column, never a full-width band.
 * Conforms to {@link FactionHeroProps}.
 *
 * The blurb in the reading voice used to close this slip; #2137 took it out.
 * `CovenFactionBody` reads the same catalog string and sets it as the coven's
 * manifesto, so the slip was saying the manifesto's first words back to it.
 *
 * This REPLACES the cork-memo-board `whimsy.exe` charm wholesale: the pinned
 * paper, the pushpins, the dotted wash, the washi-taped sticker charms and the
 * warm-brown board shadow were the lo-fi window's furniture, and none of them
 * survives the slip. What is kept is the LAYOUT — mark, text column, side stats
 * — because #1209 is a coherence pass, not a redesign.
 *
 * The raw `BOARD_SHADOW` rgba this file used to carry goes with it:
 * `--faction-coven-slip-shadow` is the slip's own lift and it flips with the
 * theme, which a hand-written warm brown never did.
 *
 * The page passes raw counts; the faction labels them in its own voice. Motto is
 * a faction constant (not a backend field). No copy changed here.
 */
export default function CovenFactionHero({
  slug,
  name,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // The coven names only `members`; the frame owns the other two labels and the
  // order (#2997).
  // ponytail: three real counts. seasonRank / total-points-won aren't sourced yet
  // (no leaderboard/aggregate endpoint) — add panels when they are.
  const stats = heroCounts(i18n.t("feed:factionHero.coven.stats.members"), {
    members,
    tasks,
    praxes,
  });

  return (
    <header style={{ marginBottom: "var(--space-2xl)" }}>
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
        {/* THE FLAT SILHOUETTE AT 74px IS ACCEPTED, not overlooked (#2726).
            This is the largest of the hat's six mounts and the one where the
            retired badge's disc-and-ring gave it the most — a struck object
            where this is a shape. The owner took that knowingly rather than
            keep a second identity alive at the other five. If this ONE mount
            later wants a setting, that is a follow-up; it is not a reason to
            re-draw the pentagram here. */}
        <CovenSigil size={74} color={DEEP} />

        <div style={{ flex: 1, minWidth: 250 }}>
          <HeroKicker style={CAPTION} text={i18n.t("feed:factionHero.coven.eyebrow")} />
          {/* The wrap rule is the frame's (#2997). The slip's 250px floor above
              already holds "Cozy Coven" hand-set at 52px, and a name that
              outgrew it wraps at its space. */}
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
          <div
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: "var(--text-title)",
              letterSpacing: "0.02em",
              color: INK,
            }}
          >
            {heroTagline(slug)}
          </div>
        </div>

        {/* counts on the side — candle-lit panels stacked in a side column */}
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
              <span style={{ fontFamily: READING, fontSize: 28, fontWeight: 600, lineHeight: 1, color: DEEP }}>
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
