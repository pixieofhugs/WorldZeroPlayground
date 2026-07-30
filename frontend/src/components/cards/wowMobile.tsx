/**
 * WOW — THE FIELD PAVILION: the shared vocabulary of Warriors of Whimsy's
 * MOBILE surfaces (kit `10-mobile-skins.html`, #901).
 *
 * The kit drew ONE phone screen — a header block, a quest list and a bottom nav
 * — not a phone version of every surface. Everything the drawing states lives
 * here, once, so the six mobile skins compose it instead of each re-deriving a
 * pavilion. This mirrors `components/duel/wowLists.tsx`, which does the same job
 * for the four duel surfaces, and §6's rule that a faction's ornament is one
 * primitive at named strengths.
 *
 * WHAT THE DRAWING STATES, and what each piece became:
 *
 *   the gold/plum checker      → {@link WowCheckerBand}, at the two heights the
 *                                kit uses (the header's 2px rule and the quest
 *                                card's 6px running head)
 *   the crested header wash    → {@link WowPavilionHeader}
 *   the gold-framed cream card → {@link WowQuestFrame}
 *   the gilt call to action    → {@link wowGiltButton}
 *
 * WHAT THE DRAWING STATES THAT IS DELIBERATELY ABSENT:
 *
 *  • the PHONE BEZEL and the 9:41 STATUS BAR. Both are the mockup's device
 *    shell, not surfaces of ours — the app already runs inside a real one. The
 *    header's right-hand `✦ 4,180` is NOT part of that shell (it is the player's
 *    score), so it survives as {@link WowPavilionHeader}'s `tally`.
 *  • the BOTTOM NAV (`✦ Desk · ⚔ Quests · ❦ Court`). The app has one global
 *    `MobileTabBar` (#494), which is app chrome and not a faction surface —
 *    ADR-0039's reasoning for the level gem applies to it exactly: navigation
 *    means the same thing to every player, so it must not acquire a faction
 *    seam. Redrawing it per faction would also strand a WOW knight with three
 *    destinations where every other player gets the full set.
 *
 * No hex, no theme ternary, no `fontSize` on a wrapper: every value is a
 * `--faction-wow-*` token and both themes arrive through the cascade.
 */
import type { CSSProperties, ReactNode } from "react";

import { WowSigil } from "../sigil/WowSigil";

export const WOW_INK = "var(--faction-wow-card-text)";
export const WOW_MUTED = "var(--faction-wow-card-muted)";
/** The header byline's ink — see the measured deviation in index.css. */
export const WOW_DEEP = "var(--faction-wow-accent-deep)";
export const WOW_PLUM = "var(--faction-wow-card-accent)";
export const WOW_GOLD = "var(--faction-wow-chronicle-gold)";
export const WOW_FIGURE = "var(--faction-wow-stamp-total)";
export const WOW_CARD = "var(--faction-wow-card-bg)";
export const WOW_PLATE = "var(--faction-wow-plate)";
export const WOW_RULE = "var(--faction-wow-chronicle-rule)";
export const WOW_DISPLAY = "var(--faction-wow-card-font)"; // MedievalSharp
export const WOW_BODY = "var(--faction-wow-body-font)"; // Lora

/**
 * The pavilion's page ground: WOW's own wallpaper, plus the court-glow and gilt
 * hatch the desktop backdrop and the profile page already wear. The kit's flat
 * mobile `page` fill is replaced by it on purpose — see the mapping table in
 * index.css.
 */
export const wowMobilePage: CSSProperties = {
  color: WOW_INK,
  fontFamily: WOW_BODY,
  backgroundColor: "var(--faction-wow-ground-from)",
  backgroundImage:
    "radial-gradient(circle at 82% 8%, var(--faction-wow-court-glow), transparent 46%), repeating-linear-gradient(135deg, transparent 0 22px, var(--faction-wow-hatch) 22px 24px), linear-gradient(165deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))",
};

/**
 * The gold/plum checker as a paint value — the kit's one repeating device.
 * `square` is the width of one gold block; the kit draws 8px on the quest card
 * and a coarser 14px behind the header.
 */
export const wowChecker = (square = 8) =>
  `repeating-linear-gradient(90deg, ${WOW_GOLD} 0 ${square}px, var(--faction-wow-plum-surface) ${square}px ${square * 2}px)`;

/** The checker run as a bar of a given height — a running head or a rule. */
export function WowCheckerBand({ height, square = 8 }: { height: number; square?: number }) {
  return <div aria-hidden style={{ height, background: wowChecker(square) }} />;
}

/**
 * The crested header: a gilt conic ring holding the crest on its field disc, a
 * MedievalSharp name, a Lora byline, a faint checker wash across the whole wash,
 * and the gold rule that closes it. `tally` rides the top-right corner where the
 * kit put the score.
 *
 * The crest is set at 58px — under `WowSigil`'s 56px motto floor the Pig-Latin
 * band would render as a smudge, and at phone width the coin is the one place
 * the motto is still legible.
 */
export function WowPavilionHeader({
  name,
  byline,
  tally,
  eyebrow,
}: {
  name: ReactNode;
  byline: ReactNode;
  tally?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        padding: "var(--space-md) var(--space-lg) var(--space-lg)",
        background: `linear-gradient(180deg, var(--faction-wow-mobile-header-from), var(--faction-wow-mobile-header-to))`,
        borderBottom: `2px solid ${WOW_GOLD}`,
      }}
    >
      {/* the kit's checker wash, laid across the whole header at a tenth */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, opacity: 0.12, background: wowChecker(14) }}
      />

      <div style={{ position: "relative" }}>
        {(eyebrow || tally) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-sm)",
              marginBottom: "var(--space-sm)",
            }}
          >
            <span className="eyebrow" style={{ fontFamily: WOW_DISPLAY, color: WOW_DEEP }}>
              {eyebrow}
            </span>
            <span
              style={{
                fontFamily: WOW_DISPLAY,
                fontSize: "var(--text-content)",
                color: WOW_FIGURE,
                whiteSpace: "nowrap",
              }}
            >
              {tally}
            </span>
          </div>
        )}

        <div
          aria-hidden
          style={{
            width: 74,
            height: 74,
            margin: "0 auto var(--space-sm)",
            borderRadius: "50%",
            background: "var(--faction-wow-avatar-ring)",
            // 4px IS --space-xs, and §4a's ring-stroke carve-out never applies
            // to an on-scale value, so it takes the token.
            padding: "var(--space-xs)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "var(--faction-wow-avatar-field)",
              border: "2px solid var(--faction-wow-plum-surface)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <WowSigil size={58} />
          </div>
        </div>

        <div
          style={{
            fontFamily: WOW_DISPLAY,
            fontSize: "var(--text-title)",
            lineHeight: 1.1,
            color: WOW_INK,
            overflowWrap: "anywhere",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: WOW_BODY,
            fontStyle: "italic",
            fontSize: "var(--text-content)",
            lineHeight: 1.4,
            color: WOW_DEEP,
          }}
        >
          {byline}
        </div>
      </div>
    </header>
  );
}

/**
 * The kit's quest card: a cream sheet inside a 1.5px gold frame, headed by the
 * 6px checker running head. Used for a quest row, and reused wherever the phone
 * needs a framed panel — the kit gives WOW exactly one panel shape.
 */
export function WowQuestFrame({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        borderRadius: 9,
        overflow: "hidden",
        background: WOW_CARD,
        border: `1.5px solid ${WOW_GOLD}`,
        ...style,
      }}
    >
      <WowCheckerBand height={6} />
      {children}
    </div>
  );
}

/**
 * A MedievalSharp section head with the illuminated rule running off it — the
 * kit's "Thy Open Quests" line, generalised.
 */
export function WowSectionHead({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        // wraps rather than overflows: at 375px a long heading beside a sort
        // toggle has nowhere to go, and the rule between them is ornament.
        flexWrap: "wrap",
        gap: "var(--space-sm) var(--space-md)",
        marginBottom: "var(--space-md)",
      }}
    >
      <span
        style={{
          fontFamily: WOW_DISPLAY,
          fontSize: "var(--text-content)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: WOW_PLUM,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        style={{
          flex: "1 1 var(--space-2xl)",
          height: 2,
          background: `linear-gradient(90deg, ${WOW_GOLD}, transparent)`,
        }}
      />
      {trailing}
    </div>
  );
}

/**
 * The gilt call to action, exactly the decree card's button metal. Pair it with
 * `className="wow-btn"` so the glisten travels behind it.
 *
 * `minHeight: 46` rather than 44: the kit specifies 46 for WOW's thumb targets
 * and #895 kept it on the duel seal, so the faction's targets stay one size.
 */
export const wowGiltButton: CSSProperties = {
  width: "100%",
  minHeight: 46,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-sm)",
  cursor: "pointer",
  fontFamily: WOW_DISPLAY,
  fontSize: "var(--text-xl)",
  letterSpacing: "0.06em",
  color: "var(--faction-wow-quest-text)",
  background:
    "linear-gradient(180deg, var(--faction-wow-quest-from) 0%, var(--faction-wow-quest-mid) 45%, var(--faction-wow-quest-to) 100%)",
  border: "2px solid var(--faction-wow-quest-border)",
  borderRadius: 7,
  padding: "var(--space-md) var(--space-lg)",
  boxShadow:
    "inset 0 1px 0 var(--faction-wow-quest-sheen), 0 2px 4px var(--faction-wow-stamp-shadow)",
  textDecoration: "none",
};

/** The quiet twin of {@link wowGiltButton} — a plum-outlined parchment plate. */
export const wowGhostButton: CSSProperties = {
  minHeight: 46,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-sm)",
  cursor: "pointer",
  fontFamily: WOW_DISPLAY,
  fontSize: "var(--text-xl)",
  letterSpacing: "0.06em",
  color: WOW_PLUM,
  background: WOW_PLATE,
  border: `2px solid ${WOW_RULE}`,
  borderRadius: 7,
  padding: "var(--space-md) var(--space-lg)",
  textDecoration: "none",
};

/** The ✦ that punctuates every WOW surface, twinkling where motion is welcome. */
export function WowSpark({ color = WOW_FIGURE }: { color?: string }) {
  return (
    <span className="wow-tw" aria-hidden style={{ color }}>
      ✦
    </span>
  );
}
