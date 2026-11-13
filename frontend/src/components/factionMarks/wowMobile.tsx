/**
 * WOW — the field pavilion: the shared vocabulary of WOW's mobile skins (#901),
 * drawn once (§6): {@link WowCheckerBand}, {@link WowPavilionHeader},
 * {@link WowQuestFrame}, {@link wowGiltButton}. Mirrors `duel/wowLists.tsx`.
 *
 * Deliberately absent: the mockup's bezel/status bar (device shell — but the
 * header's score survives, via `footer`/`tally`, #1553), and its bottom nav (the
 * global `MobileTabBar` is app chrome, no faction seam — ADR-0039).
 *
 * No hex, no theme ternary: every value is a `--faction-wow-*` token.
 */
import type { CSSProperties, ReactNode } from "react";

import { factionRoleVar } from "../../utils/factionRoles";
import { WowSigil } from "../sigil/WowSigil";

/**
 * Core roles asked for directly: this module is mounted under six roots and has
 * no prefix of its own (#2674). Non-role extras (gilt, figure gold, plate, rule)
 * stay WOW's own tokens.
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
 * Inks for type set directly on `wowMobilePage` (#2248): its darkest composite
 * (#dcc6a1) fails the card inks, so these are the same hues walked down to AA
 * (measured in `index.css`). Choose by GROUND, not role — on the card, plate and
 * crest wash the card inks are still right.
 */
export const WOW_PAGE_PLUM = "var(--faction-wow-ground-accent)";
export const WOW_PAGE_LABEL = "var(--faction-wow-ground-label)";
export const WOW_PAGE_MUTED = "var(--faction-wow-ground-quiet)";

/**
 * The pavilion's page ground: WOW's wallpaper plus court-glow and gilt hatch (the
 * kit's flat fill replaced on purpose — see index.css).
 */
export const wowMobilePage: CSSProperties = {
  color: WOW_INK,
  fontFamily: WOW_BODY,
  backgroundColor: "var(--faction-wow-ground-from)",
  backgroundImage:
    "radial-gradient(circle at 82% 8%, var(--faction-wow-court-glow), transparent 46%), repeating-linear-gradient(135deg, transparent 0 22px, var(--faction-wow-hatch) 22px 24px), linear-gradient(165deg, var(--faction-wow-ground-from), var(--faction-wow-ground-to))",
};

/** The gold/plum checker; `square` is one gold block (8px card, 14px header). */
export const wowChecker = (square = 8) =>
  `repeating-linear-gradient(90deg, ${WOW_GOLD} 0 ${square}px, var(--faction-wow-plum-surface) ${square}px ${square * 2}px)`;

/** The checker run as a bar of a given height — a running head or a rule. */
export function WowCheckerBand({ height, square = 8 }: { height: number; square?: number }) {
  return <div aria-hidden style={{ height, background: wowChecker(square) }} />;
}

/**
 * The crested header: gilt ring and crest, name, byline, a faint checker wash and
 * a closing gold rule. `tally` rides the top-right corner.
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
  /** Closes the crest (the home's level track, #1553), keeping one card. */
  footer?: ReactNode;
}) {
  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
        padding: "var(--space-md) var(--space-lg) var(--space-lg)",
        background: `linear-gradient(180deg, var(--faction-wow-avatar-field), var(--faction-wow-ground-to))`,
        borderBottom: `2px solid ${WOW_GOLD}`,
      }}
    >
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
            // 4px is on-scale, so it takes the token.
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

        {/* Always the page heading on both consumers, so an unconditional <h1>
            (#1817). */}
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
 * The quest card: cream sheet, 1.5px gold frame, 6px checker head. WOW's one
 * panel shape on the phone.
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

/** A section head with the illuminated rule running off it. */
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
        // Wraps: at 375px a long heading beside a toggle has nowhere to go.
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
        // Mounted on `wowMobilePage`, so the page plum (#2248).
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
 * The gilt CTA; pair with `className="wow-btn"` for the glisten. `minHeight: 46`
 * is WOW's thumb-target size (kit, #895), kept one size across the faction.
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
    "linear-gradient(180deg, var(--faction-wow-quest-from) 0%, var(--faction-wow-balloon-5) 45%, var(--faction-wow-quest-to) 100%)",
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
