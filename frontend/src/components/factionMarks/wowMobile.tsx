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
 *    score), so it survives — the home now draws it in `footer` beside the level
 *    track (#1553) and hands `tally` its two actions, but the slot is the same
 *    corner the kit drew.
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

import { factionRoleVar } from "../../utils/factionRoles";
import { WowSigil } from "../sigil/WowSigil";

/**
 * THE FIVE CORE ROLES ARE ASKED FOR DIRECTLY, BECAUSE THIS MODULE HAS NO ROOT
 * (#2674). Lane 04's surfaces spread `factionRoleVars(slug, '<their own
 * prefix>')` on a root and read `var(--<prefix>-ink, …)` below it. This file is
 * shared vocabulary: six mobile skins import these constants and mount them
 * under six different roots, `WowFieldDesk`'s among them, which is outside this
 * lane. There is no one root to declare a prefix on, and one prefix shared
 * between the pavilion and every skin that composes it would BE the `--kit-*`
 * namespace the law declines. `factionRoleVar` answers one role with no
 * all-or-nothing seam to protect and returns the identical strings these
 * constants held before.
 *
 * The five that are NOT roles stay exactly as they are: the gilt, the figure
 * gold, the parchment plate and the chronicle rule are WOW's own vocabulary and
 * decision 07 leaves a surface's extras to the surface.
 */
export const WOW_INK = factionRoleVar("wow", "ink");
export const WOW_MUTED = factionRoleVar("wow", "quiet");
/** The header byline's ink — see the measured deviation in index.css. */
export const WOW_DEEP = "var(--faction-wow-accent-deep)";
export const WOW_PLUM = factionRoleVar("wow", "accent");
export const WOW_GOLD = "var(--faction-wow-chronicle-gold)";
export const WOW_FIGURE = "var(--faction-wow-stamp-total)";
export const WOW_CARD = factionRoleVar("wow", "paper");
export const WOW_PLATE = "var(--faction-wow-plate)";
export const WOW_RULE = "var(--faction-wow-chronicle-rule)";
export const WOW_DISPLAY = factionRoleVar("wow", "face"); // MedievalSharp
export const WOW_BODY = "var(--faction-wow-body-font)"; // Lora

/**
 * The three inks for type set DIRECTLY ON `wowMobilePage` (#2248).
 *
 * The pavilion ground is not the cream card. Its darkest point — the court glow
 * over the gilt hatch over `-ground-to` — composites to #dcc6a1, where the card
 * inks above read 3.82 (`WOW_PLUM`), 3.51 (`WOW_DEEP`) and 3.14 (`WOW_MUTED`).
 * These are the same three hues walked down until they clear AA on it; the
 * measurement and the reason receding the ground cannot work are recorded at
 * the declarations in `index.css`.
 *
 * WHICH ONE TO REACH FOR IS THE GROUND, NOT THE ROLE. On the cream quest card,
 * the near-white plate and the crest wash, `WOW_PLUM` / `WOW_DEEP` / `WOW_MUTED`
 * are still the right inks and still measured — do not sweep them.
 */
export const WOW_PAGE_PLUM = "var(--faction-wow-ground-accent)";
export const WOW_PAGE_LABEL = "var(--faction-wow-ground-label)";
export const WOW_PAGE_MUTED = "var(--faction-wow-ground-quiet)";

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
 * The mark is set at 58px. That number was chosen to clear `WowSigil`'s old
 * 56px motto floor, back when the mark was the gilt crest and its Pig-Latin
 * band smudged below it. Sigil Studies v2 replaced the crest with the googly
 * crown, which has no lettering and no floor, so 58 is now just the size the
 * pavilion header was drawn at.
 */
export function WowPavilionHeader({
  name,
  byline,
  tally,
  eyebrow,
  footer,
}: {
  name: ReactNode;
  byline: ReactNode;
  tally?: ReactNode;
  eyebrow?: ReactNode;
  /** Optional block closing the crest — the home's level track sits here
   *  (#1553), which is why the identity block stays ONE card on this skin
   *  rather than a crest with a stray panel bolted under it. */
  footer?: ReactNode;
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
            <span className="label-heading" style={{ fontFamily: WOW_DISPLAY, color: WOW_DEEP }}>
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

        {/* The crest's name IS the page heading on both consumers — the carried
            life on the mobile home, the faction on the faction page — and
            neither draws another one, so it is an unconditional <h1> and needs
            no level prop (#1817). Preflight already strips the element's own
            margin and weight; `margin: 0` is stated anyway so the crest cannot
            drift on it. */}
        <h1
          style={{
            fontFamily: WOW_DISPLAY,
            fontSize: "var(--text-title)",
            lineHeight: 1.1,
            color: WOW_INK,
            overflowWrap: "anywhere",
            margin: 0,
          }}
        >
          {name}
        </h1>
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
        {footer}
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
          // Both consumers mount this on `wowMobilePage`, so it takes the page's
          // own plum rather than the card's (#2248).
          color: WOW_PAGE_PLUM,
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
