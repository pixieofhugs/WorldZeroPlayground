import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { TaskCrown } from "../../../components/cards/TaskCrown";
import { computeDisplayPoints } from "../../../utils/points";
import { factionName } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Warriors of Whimsy faction-body — the whimsy.exe cork-memo-board skin of the
 * standardized six-section spine (② About, ③ join.exe, ④ Tasks, ⑤ Praxis,
 * ⑥ Members). Section ① (hero + side stat charms) is WowFactionHero, above.
 *
 * Same shape as EverymenFactionBody / UaFactionBody — Tasks/Praxis reuse the
 * app-wide per-faction cards (TaskCard / PraxisCard already dispatch to the WoW
 * atoms) so this file only owns the board chrome the design adds around them: the
 * two-column layout, the taped index cards, the pinned join.exe window, the
 * Witch-of-the-week polaroid + coven roster, and the FDL laurel on the single
 * top-scoring praxis.
 *
 * Every colour resolves to a --faction-wow-* token (dark-mode-aware via the
 * cascade). The script face is the WoW card-font token (Caveat); body copy uses
 * --font-body, matching WowTaskCard and the WoW PraxisCard branch.
 */

const PINK = "var(--faction-wow)";
const CARD_BG = "var(--faction-wow-card-bg)";
const INK = "var(--faction-wow-card-text)";
const ACCENT = "var(--faction-wow-card-accent)";
const MUTED = "var(--faction-wow-card-muted)";
const NOTEPAD = "var(--faction-wow-notepad-bg)";
const NOTEPAD_BORDER = "var(--faction-wow-notepad-border)";
const WIN_BORDER = "var(--faction-wow-win-border)";
const TITLE_FROM = "var(--faction-wow-title-from)";
const TITLE_TO = "var(--faction-wow-title-to)";
const TITLE_TEXT = "var(--faction-wow-title-text)";
const TAPE = "var(--faction-wow-tape)";
const IVY = "var(--faction-wow-ivy)";
const IVY_LEAF = "var(--faction-wow-ivy-leaf)";

const SCRIPT = "var(--faction-wow-card-font)";
const BODY = "var(--font-body)";

// The board's warm-brown drop shadow + the index card's ruling have no dedicated
// tokens; the WoW atoms hardcode the same warm rgba pair for their pinned paper.
// Reuse them so this skin matches the atoms exactly.
// ponytail: no --faction-wow-board-shadow / -rule token exists yet.
const BOARD_SHADOW = "rgba(80,50,30,0.28)";
const PIN_SHADOW = "rgba(80,50,30,0.4)";
// Faint hairline for a card edge — a muted mix of the notepad border.
const HAIRLINE = "color-mix(in srgb, var(--faction-wow-notepad-border) 55%, transparent)";

/** Tiny four-point sparkle — the WoW chrome's signature glyph. */
function Sparkle({ size = 12, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
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
        background: `radial-gradient(circle at 35% 30%, ${NOTEPAD}, ${color} 62%, ${PIN_SHADOW})`,
        boxShadow: `0 5px 7px ${PIN_SHADOW}`,
        zIndex: 16,
        ...style,
      }}
    />
  );
}

/** A strip of washi tape, tinted to any charm colour. */
function Tape({ color, style }: { color: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        width: 72,
        height: 22,
        background: color,
        opacity: 0.8,
        boxShadow: `0 2px 4px ${BOARD_SHADOW}`,
        borderRadius: 1,
        ...style,
      }}
    />
  );
}

/** Section heading — a Caveat label tacked to a little kraft sticker. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: SCRIPT,
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1,
        color: INK,
        background: CARD_BG,
        border: `1px solid ${NOTEPAD_BORDER}`,
        borderRadius: 8,
        padding: "1px 12px",
        transform: "rotate(-1.5deg)",
        boxShadow: `0 2px 5px ${BOARD_SHADOW}`,
      }}
    >
      {children}
    </span>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: BODY, fontSize: 8.5, letterSpacing: "0.18em", textTransform: "uppercase", color: MUTED, margin: "8px 0 2px" }}>
      {children}
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** Circular initials sticker — pink→ink wash face, matching the design polaroids. */
function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(150deg, ${TITLE_FROM}, ${PINK})`,
        border: `${size > 40 ? 2 : 1.5}px solid ${WIN_BORDER}`,
        boxShadow: size > 40 ? `0 3px 10px ${BOARD_SHADOW}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: BODY,
        fontWeight: 700,
        fontSize: size * 0.4,
        color: NOTEPAD,
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function WowFactionBody({ state }: { state: FactionDetailState }) {
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  // ② manifesto paragraphs — split the single description on blank lines.
  const paragraphs = (faction.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; roster = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {/* ② ABOUT — taped lined index card */}
        <div style={{ position: "relative", transform: "rotate(-1deg)" }}>
          <Tape color={IVY_LEAF} style={{ top: -10, right: 30, transform: "rotate(6deg)" }} />
          <Tape color={TAPE} style={{ top: -10, left: 24, transform: "rotate(-7deg)" }} />
          <div
            style={{
              position: "relative",
              background: NOTEPAD,
              backgroundImage: `repeating-linear-gradient(${NOTEPAD}, ${NOTEPAD} 25px, ${HAIRLINE} 25px, ${HAIRLINE} 26px)`,
              border: `1px solid ${NOTEPAD_BORDER}`,
              borderRadius: 4,
              boxShadow: `0 10px 22px ${BOARD_SHADOW}`,
              padding: "20px 24px 22px 46px",
            }}
          >
            {/* red margin rule */}
            <div style={{ position: "absolute", left: 32, top: 0, bottom: 0, width: 2, background: `color-mix(in srgb, ${PINK} 55%, transparent)` }} />
            <div style={{ fontFamily: SCRIPT, fontSize: 30, fontWeight: 700, color: ACCENT, lineHeight: 1, marginBottom: 10 }}>
              the manifesto ✦
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {paragraphs.length ? (
                paragraphs.map((para, i) => (
                  <p key={i} style={{ fontFamily: BODY, fontSize: 11.5, lineHeight: 1.85, color: MUTED, margin: 0 }}>
                    {para}
                  </p>
                ))
              ) : (
                <p style={{ fontFamily: BODY, fontSize: 11.5, lineHeight: 1.85, color: MUTED, margin: 0 }}>
                  No manifesto scribbled yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>Tasks</SectionHeading>
          <Kicker>Fresh quests on the board</Kicker>
          {tasks.length === 0 ? (
            <p style={{ fontFamily: BODY, fontSize: 11, color: MUTED, marginTop: 12 }}>No quests pinned up.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "flex-start", marginTop: 16 }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  displayPoints={computeDisplayPoints(
                    task.point_value,
                    viewerFactionSlug,
                    task.primary_faction_slug,
                    gameFactions,
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* ⑤ PRAXIS */}
        <div>
          <SectionHeading>Praxis</SectionHeading>
          <Kicker>Spells that stuck the landing</Kicker>
          {recentPraxis.length === 0 ? (
            <p style={{ fontFamily: BODY, fontSize: 11, color: MUTED, marginTop: 12 }}>Nothing cast yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start", marginTop: 16 }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={44}
                      innerBg={NOTEPAD}
                      glyphColor={ACCENT}
                      rotate="-8deg"
                      shadow={`drop-shadow(1.5px 2px 0 ${BOARD_SHADOW})`}
                      style={{ position: "absolute", top: -14, right: -10, zIndex: 5 }}
                    />
                  )}
                  <PraxisCard praxis={praxis} showCrown={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT RAIL ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        {/* ③ join.exe — pinned window: standing / join / gate */}
        {membership.state !== "none" && (
          <div style={{ position: "relative", transform: "rotate(1deg)" }}>
            <Pushpin color={ACCENT} style={{ top: -10, left: "50%", transform: "translateX(-50%)" }} />
            <div style={{ borderRadius: 13, overflow: "hidden", border: `2px solid ${WIN_BORDER}`, boxShadow: `0 12px 24px ${BOARD_SHADOW}` }}>
              {/* title bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 12px",
                  background: `linear-gradient(180deg, ${TITLE_FROM}, ${TITLE_TO})`,
                  borderBottom: `2px solid ${WIN_BORDER}`,
                }}
              >
                <span style={{ display: "flex", gap: 4 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: PINK }} />
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: IVY_LEAF }} />
                </span>
                <span style={{ marginLeft: "auto", fontFamily: BODY, fontSize: 9.5, color: TITLE_TEXT }}>join.exe</span>
              </div>

              <div style={{ background: NOTEPAD, padding: 18 }}>
                {membership.state === "member" && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                      <Sparkle size={30} color={ACCENT} />
                    </div>
                    <div style={{ fontFamily: SCRIPT, fontSize: 25, fontWeight: 700, color: IVY, lineHeight: 1 }}>
                      You're in the circle
                    </div>
                    <div style={{ fontFamily: BODY, fontSize: 10.5, color: MUTED, marginTop: 6 }}>
                      Standing · <b style={{ color: ACCENT }}>coven witch</b>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: SCRIPT, fontSize: 26, fontWeight: 700, color: ACCENT, lineHeight: 1, marginBottom: 6 }}>
                      The circle is open
                    </div>
                    <div style={{ fontFamily: BODY, fontSize: 10.5, lineHeight: 1.55, color: MUTED, marginBottom: 14 }}>
                      You've done the work — welcome home, witch.
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{
                        width: "100%",
                        fontFamily: BODY,
                        fontSize: 11.5,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: NOTEPAD,
                        background: PINK,
                        border: "none",
                        borderRadius: 10,
                        padding: 12,
                        boxShadow: `0 6px 16px color-mix(in srgb, ${PINK} 40%, transparent)`,
                        cursor: "pointer",
                      }}
                    >
                      Join the coven ✦
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div style={{ fontFamily: BODY, fontSize: 10.5, lineHeight: 1.6, color: INK, marginBottom: 14 }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? `Join ${faction.name}? You won't be able to rejoin ${factionName(membership.currentFactionSlug)} after leaving.`
                        : `Join ${faction.name}?`}
                    </div>
                    {membership.joinError && (
                      <div style={{ fontFamily: BODY, fontSize: 10, color: "var(--color-danger)", marginBottom: 8 }}>{membership.joinError}</div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{
                          flex: 1,
                          fontFamily: BODY,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: NOTEPAD,
                          background: PINK,
                          border: "none",
                          borderRadius: 9,
                          padding: 11,
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {membership.joining ? "Joining…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{
                          fontFamily: BODY,
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: MUTED,
                          background: "transparent",
                          border: `1px solid ${WIN_BORDER}`,
                          borderRadius: 9,
                          padding: "11px 14px",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {membership.state === "gate" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 12 }}>
                      <span style={{ marginTop: 3 }}>
                        <Sparkle size={20} color={IVY} />
                      </span>
                      <span style={{ fontFamily: SCRIPT, fontSize: 23, fontWeight: 700, color: ACCENT, lineHeight: 1.2 }}>
                        Not in the circle — yet
                      </span>
                    </div>
                    <div style={{ fontFamily: BODY, fontSize: 10.5, lineHeight: 1.55, color: MUTED }}>
                      Keep casting spells worthy of {faction.name} and the coven will leave a light on. The weird ones always find their way home.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — Witch-of-the-week polaroid + coven roster */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none", alignSelf: "center" }}>
              <div
                style={{
                  position: "relative",
                  transform: "rotate(-2deg)",
                  width: 180,
                  background: NOTEPAD,
                  border: `1px solid ${HAIRLINE}`,
                  boxShadow: `0 10px 20px ${BOARD_SHADOW}`,
                  padding: "10px 10px 0",
                }}
              >
                <Pushpin color={IVY} style={{ top: -11, left: "50%", transform: "translateX(-50%)" }} />
                <div
                  style={{
                    height: 120,
                    background: `linear-gradient(140deg, ${TITLE_TO}, ${ACCENT})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Avatar name={spot.display_name} size={60} />
                </div>
                <div style={{ padding: "8px 4px 14px", textAlign: "center" }}>
                  <div style={{ fontFamily: BODY, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED }}>
                    Witch of the week
                  </div>
                  <div style={{ fontFamily: SCRIPT, fontSize: 26, fontWeight: 700, color: ACCENT, lineHeight: 1 }}>
                    {spot.display_name}
                  </div>
                  <div style={{ fontFamily: BODY, fontSize: 8.5, color: INK, marginTop: 2 }}>
                    lvl {spot.level} · {spot.all_time_score.toLocaleString()} pts
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ position: "relative", transform: "rotate(0.8deg)" }}>
            <Tape color={IVY_LEAF} style={{ top: -9, left: 26, transform: "rotate(-6deg)", width: 72, height: 22 }} />
            <div
              style={{
                background: NOTEPAD,
                backgroundImage: `repeating-linear-gradient(${NOTEPAD}, ${NOTEPAD} 23px, ${HAIRLINE} 23px, ${HAIRLINE} 24px)`,
                border: `1px solid ${NOTEPAD_BORDER}`,
                borderRadius: 4,
                boxShadow: `0 10px 20px ${BOARD_SHADOW}`,
                padding: "14px 16px",
              }}
            >
              <div style={{ fontFamily: SCRIPT, fontSize: 23, fontWeight: 700, color: ACCENT, lineHeight: 1, marginBottom: 8 }}>
                the coven roster
              </div>
              {roster.length === 0 ? (
                <p style={{ fontFamily: BODY, fontSize: 11, color: MUTED }}>
                  {spot ? "No other witches in the circle yet." : "No members yet."}
                </p>
              ) : (
                roster.map((m) => (
                  <Link
                    key={m.id}
                    to={`/characters/${m.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", textDecoration: "none" }}
                  >
                    <Avatar name={m.display_name} size={26} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: SCRIPT,
                        fontSize: 19,
                        color: INK,
                        lineHeight: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.display_name}
                    </span>
                    <span style={{ fontFamily: BODY, fontSize: 9, color: ACCENT }}>lvl {m.level}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
