import type { CSSProperties } from "react";
import type { FactionHeroProps } from "../../pages/FactionDetail";

/**
 * Warriors of Whimsy faction-page hero — whimsy.exe pinned to a cork memo board.
 * A pastel "app window" charm, a Caveat-script wordmark + motto, the blurb, and —
 * per the faction-page standardization — the three counts as taped sticker charms
 * in a SIDE column (never a full-width band). Two pushpins tack the banner down.
 * Ported from the WoW design kit; conforms to {@link FactionHeroProps}.
 *
 * Theme-aware through the cascade: every colour resolves to a --faction-wow-*
 * token (which already carries light + dark values), so the board never mutates
 * the global theme. The script face is the WoW card-font token (Caveat); body
 * copy uses --font-body, matching TaskCardWow / the WoW PraxisCard branch.
 *
 * The page passes raw counts; the faction labels them in its own whimsy voice.
 * Motto is a faction constant (not a backend field).
 */

const MOTTO = "make it weird, make it matter";

// Token shorthands — every value resolves to a --faction-wow-* var.
const PINK = "var(--faction-wow)";
const CARD_BG = "var(--faction-wow-card-bg)";
const INK = "var(--faction-wow-card-text)";
const ACCENT = "var(--faction-wow-card-accent)";
const MUTED = "var(--faction-wow-card-muted)";
const NOTEPAD = "var(--faction-wow-notepad-bg)";
const WIN_BORDER = "var(--faction-wow-win-border)";
const TITLE_TO = "var(--faction-wow-title-to)";
const IVY = "var(--faction-wow-ivy)";
const IVY_LEAF = "var(--faction-wow-ivy-leaf)";
const DOT = "var(--faction-wow-dot)";

const SCRIPT = "var(--faction-wow-card-font)";
const BODY = "var(--font-body)";

// The board's board-brown shadow has no dedicated token; the WoW atoms use a raw
// warm-brown rgba for their pinned-paper drop shadows. Reuse the same value.
// ponytail: no --faction-wow-board-shadow token exists; matching the atoms' rgba.
const BOARD_SHADOW = "rgba(80,50,30,0.3)";

/** Tiny four-point sparkle — same glyph the WoW task/window chrome uses. */
function Sparkle({ size = 12, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
      />
    </svg>
  );
}

/** A pastel "app" charm — a little window pinned to the board, whimsy.exe itself. */
function AppCharm({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0, filter: `drop-shadow(0 6px 12px ${BOARD_SHADOW})` }}
    >
      <rect x="8" y="12" width="48" height="40" rx="7" fill={NOTEPAD} stroke={WIN_BORDER} strokeWidth="2.5" />
      <rect x="8" y="12" width="48" height="12" rx="7" fill={TITLE_TO} />
      <circle cx="15" cy="18" r="1.8" fill={NOTEPAD} />
      <circle cx="21" cy="18" r="1.8" fill={NOTEPAD} />
      <path d="M20 34h24M20 41h15" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M50 6c.4 3.5 1.9 5 5.4 5.4-3.5.4-5 1.9-5.4 5.4-.4-3.5-1.9-5-5.4-5.4 3.5-.4 5-1.9 5.4-5.4z"
        fill={IVY_LEAF}
      />
    </svg>
  );
}

/** A round glossy pushpin, tinted to any charm colour. */
function Pushpin({ color, style }: { color: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${NOTEPAD}, ${color} 62%, ${BOARD_SHADOW})`,
        boxShadow: `0 4px 6px ${BOARD_SHADOW}`,
        zIndex: 5,
        ...style,
      }}
    />
  );
}

export default function WowFactionHero({
  name,
  description,
  members,
  tasks,
  praxes,
}: FactionHeroProps) {
  // The coven tallies its own counts — page passes raw numbers only.
  // ponytail: three real counts. seasonRank / total-points-won aren't sourced yet
  // (no leaderboard/aggregate endpoint) — add charms when they are.
  const statTags = [
    { value: members, label: "witches", color: PINK, rot: "-3deg" },
    { value: tasks, label: "quests open", color: IVY, rot: "2.5deg" },
    { value: praxes, label: "spells filed", color: ACCENT, rot: "-2deg" },
  ];

  return (
    <header style={{ marginBottom: 32 }}>
      <div style={{ position: "relative", transform: "rotate(-0.6deg)" }}>
        {/* two pushpins tack the banner to the board */}
        <Pushpin color={PINK} style={{ top: -11, left: 34 }} />
        <Pushpin color={IVY_LEAF} style={{ top: -11, right: 34 }} />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
            background: `linear-gradient(135deg, ${NOTEPAD}, ${CARD_BG})`,
            border: `1.5px solid ${WIN_BORDER}`,
            borderRadius: 14,
            padding: "22px 26px",
            boxShadow: `0 12px 26px ${BOARD_SHADOW}`,
            overflow: "hidden",
          }}
        >
          {/* faint dotted-grid wash inside the banner, keyed to the cork board */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.5,
              backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
              backgroundSize: "13px 13px",
            }}
          />

          <div style={{ position: "relative" }}>
            <AppCharm size={74} />
          </div>

          <div style={{ position: "relative", flex: 1, minWidth: 250 }}>
            <div
              style={{
                fontFamily: BODY,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: 2,
              }}
            >
              World Zero · Faction · est. MMXXI
            </div>
            <h1
              style={{
                fontFamily: SCRIPT,
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 0.9,
                margin: 0,
                color: ACCENT,
                overflowWrap: "anywhere",
              }}
            >
              {name}
            </h1>
            <div style={{ fontFamily: SCRIPT, fontSize: 24, color: PINK, marginTop: 2 }}>
              {MOTTO}
            </div>
            <p
              style={{
                fontFamily: BODY,
                fontSize: 11,
                lineHeight: 1.6,
                color: MUTED,
                maxWidth: 440,
                margin: "8px 0 0",
              }}
            >
              {description ?? "Nobody said the work couldn't be fun. Cast something."}
            </p>
          </div>

          {/* stats on the side — taped sticker charms stacked in a side column */}
          <div style={{ position: "relative", flexShrink: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            {statTags.map((s) => (
              <div
                key={s.label}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: NOTEPAD,
                  border: `3px solid ${NOTEPAD}`,
                  borderRadius: 18,
                  padding: "5px 14px 5px 10px",
                  boxShadow: `0 4px 9px ${BOARD_SHADOW}`,
                  transform: `rotate(${s.rot})`,
                }}
              >
                <Sparkle size={18} color={s.color} />
                <span style={{ fontFamily: SCRIPT, fontSize: 28, fontWeight: 700, lineHeight: 1, color: s.color }}>
                  {s.value}
                </span>
                <span
                  style={{
                    fontFamily: BODY,
                    fontSize: 8,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: INK,
                    width: 66,
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
