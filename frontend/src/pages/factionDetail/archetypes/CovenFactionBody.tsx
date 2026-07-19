import { useState, type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { TaskCrown } from "../../../components/cards/TaskCrown";
import { computeDisplayPoints } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Warriors of Whimsy faction-body — the whimsy.exe cork-memo-board skin of the
 * standardized six-section spine (② About, ③ join.exe, ④ Tasks, ⑤ Praxis,
 * ⑥ Members). Section ① (hero + side stat charms) is CovenFactionHero, above.
 *
 * Same shape as EverymenFactionBody / UaFactionBody — Tasks/Praxis reuse the
 * app-wide per-faction cards (TaskCard / PraxisCard already dispatch to the WoW
 * atoms) so this file only owns the board chrome the design adds around them: the
 * two-column layout, the taped index cards, the pinned join.exe window, the
 * Witch-of-the-week polaroid + coven roster, and the FDL laurel on the single
 * top-scoring praxis.
 *
 * Every colour resolves to a --faction-coven-* token (dark-mode-aware via the
 * cascade). The script face is the WoW card-font token (Caveat); body copy uses
 * --font-body, matching CovenTaskCard and the WoW PraxisCard branch.
 */

const PINK = "var(--faction-coven)";
const CARD_BG = "var(--faction-coven-card-bg)";
const INK = "var(--faction-coven-card-text)";
const ACCENT = "var(--faction-coven-card-accent)";
const MUTED = "var(--faction-coven-card-muted)";
const NOTEPAD = "var(--faction-coven-notepad-bg)";
const NOTEPAD_BORDER = "var(--faction-coven-notepad-border)";
const WIN_BORDER = "var(--faction-coven-win-border)";
const TITLE_FROM = "var(--faction-coven-title-from)";
const TITLE_TO = "var(--faction-coven-title-to)";
const TITLE_TEXT = "var(--faction-coven-title-text)";
const TAPE = "var(--faction-coven-tape)";
const IVY = "var(--faction-coven-ivy)";
const IVY_LEAF = "var(--faction-coven-ivy-leaf)";

const SCRIPT = "var(--faction-coven-card-font)";
const BODY = "var(--font-body)";

// The board's warm-brown drop shadow + the index card's ruling have no dedicated
// tokens; the WoW atoms hardcode the same warm rgba pair for their pinned paper.
// Reuse them so this skin matches the atoms exactly.
// ponytail: no --faction-coven-board-shadow / -rule token exists yet.
const BOARD_SHADOW = "rgba(80,50,30,0.28)";
const PIN_SHADOW = "rgba(80,50,30,0.4)";
// Faint hairline for a card edge — a muted mix of the notepad border.
const HAIRLINE = "color-mix(in srgb, var(--faction-coven-notepad-border) 55%, transparent)";

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

const SECTION_HEADING: CSSProperties = {
  display: "inline-block",
  fontFamily: SCRIPT,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat on a kraft sticker — the sticker is drawn, not typeset.
  fontSize: 28,
  fontWeight: 700,
  lineHeight: 1,
  color: INK,
  background: CARD_BG,
  border: `1px solid ${NOTEPAD_BORDER}`,
  borderRadius: 8,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the sticker's own inset. The 1px tuck is optical, sized to Caveat's ascenders; rounding it to a scale rung fattens the drawn sticker.
  padding: "1px 12px",
  transform: "rotate(-1.5deg)",
  boxShadow: `0 2px 5px ${BOARD_SHADOW}`,
};

/** Section heading — a Caveat label tacked to a little kraft sticker. */
function SectionHeading({ children }: { children: ReactNode }) {
  return <span style={SECTION_HEADING}>{children}</span>;
}

const KICKER: CSSProperties = {
  fontFamily: BODY,
  fontSize: "var(--text-sm)",
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: MUTED,
  margin: "var(--space-sm) 0 var(--space-xs)",
};

function Kicker({ children }: { children: ReactNode }) {
  return <div style={KICKER}>{children}</div>;
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

export default function CovenFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  // ② manifesto paragraphs — split the single description on blank lines.
  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; roster = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
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
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the index card's ruled inset. The 46px left gutter clears the drawn red margin rule at left:32 — rounding it to a scale rung runs the text into the rule.
              padding: "20px 24px 22px 46px",
            }}
          >
            {/* red margin rule */}
            <div style={{ position: "absolute", left: 32, top: 0, bottom: 0, width: 2, background: `color-mix(in srgb, ${PINK} 55%, transparent)` }} />
            <div
              style={{
                fontFamily: SCRIPT,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — handwriting on the board, not typeset copy.
                fontSize: 30,
                fontWeight: 700,
                color: ACCENT,
                lineHeight: 1,
                marginBottom: "var(--space-md)",
              }}
            >
              {t("coven.manifesto.heading")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {paragraphs.length ? (
                paragraphs.map((para, i) => (
                  <p key={i} className="content-text" style={{ fontFamily: BODY, lineHeight: 1.85, color: MUTED, margin: 0 }}>
                    {para}
                  </p>
                ))
              ) : (
                <p className="content-text" style={{ fontFamily: BODY, lineHeight: 1.85, color: MUTED, margin: 0 }}>
                  {t("coven.manifesto.empty")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>{t("coven.tasks.heading")}</SectionHeading>
          <Kicker>{t("coven.tasks.kicker")}</Kicker>
          {tasks.length === 0 ? (
            <p className="content-text" style={{ fontFamily: BODY, color: MUTED, marginTop: "var(--space-md)" }}>{t("coven.tasks.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start", marginTop: "var(--space-lg)" }}>
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
          <SectionHeading>{t("coven.praxis.heading")}</SectionHeading>
          <Kicker>{t("coven.praxis.kicker")}</Kicker>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ fontFamily: BODY, color: MUTED, marginTop: "var(--space-md)" }}>{t("coven.praxis.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start", marginTop: "var(--space-lg)" }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
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
                  gap: "var(--space-sm)",
                  padding: "var(--space-sm) var(--space-md)",
                  background: `linear-gradient(180deg, ${TITLE_FROM}, ${TITLE_TO})`,
                  borderBottom: `2px solid ${WIN_BORDER}`,
                }}
              >
                <span style={{ display: "flex", gap: "var(--space-xs)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: PINK }} />
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: ACCENT }} />
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: IVY_LEAF }} />
                </span>
                <span style={{ marginLeft: "auto", fontFamily: BODY, fontSize: "var(--text-base)", color: TITLE_TEXT }}>{t("coven.join.windowTitle")}</span>
              </div>

              <div style={{ background: NOTEPAD, padding: "var(--space-lg)" }}>
                {membership.state === "member" && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-sm)" }}>
                      <Sparkle size={30} color={ACCENT} />
                    </div>
                    <div
                      style={{
                        fontFamily: SCRIPT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — handwriting on the board, not typeset copy.
                        fontSize: 25,
                        fontWeight: 700,
                        color: IVY,
                        lineHeight: 1,
                      }}
                    >
                      {t("coven.join.memberTitle")}
                    </div>
                    <div style={{ fontFamily: BODY, fontSize: "var(--text-md)", color: MUTED, marginTop: "var(--space-sm)" }}>
                      <Trans t={t} i18nKey="coven.join.memberStanding">
                        Standing · <b style={{ color: ACCENT }}>coven witch</b>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: SCRIPT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — handwriting on the board, not typeset copy.
                        fontSize: 26,
                        fontWeight: 700,
                        color: ACCENT,
                        lineHeight: 1,
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {t("coven.join.eligibleTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: BODY, lineHeight: 1.55, color: MUTED, marginBottom: "var(--space-lg)" }}>
                      {t("coven.join.eligibleBody")}
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{
                        width: "100%",
                        fontFamily: BODY,
                        fontSize: "var(--text-lg)",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: NOTEPAD,
                        background: PINK,
                        border: "none",
                        borderRadius: 10,
                        padding: "var(--space-md)",
                        boxShadow: `0 6px 16px color-mix(in srgb, ${PINK} 40%, transparent)`,
                        cursor: "pointer",
                      }}
                    >
                      {t("coven.join.joinButton")}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div className="content-text" style={{ fontFamily: BODY, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? t("detail.join.confirmSwitch", {
                            faction: factionName(faction.slug),
                            current: factionName(membership.currentFactionSlug),
                          })
                        : t("detail.join.confirm", { faction: factionName(faction.slug) })}
                    </div>
                    {membership.joinError && (
                      <div className="content-text" style={{ fontFamily: BODY, color: "var(--color-danger)", marginBottom: "var(--space-sm)" }}>{membership.joinError}</div>
                    )}
                    <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{
                          flex: 1,
                          fontFamily: BODY,
                          fontSize: "var(--text-md)",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: NOTEPAD,
                          background: PINK,
                          border: "none",
                          borderRadius: 9,
                          padding: "var(--space-md)",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {membership.joining
                          ? t("coven.join.joining")
                          : t("coven.join.confirmButton")}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{
                          fontFamily: BODY,
                          fontSize: "var(--text-base)",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: MUTED,
                          background: "transparent",
                          border: `1px solid ${WIN_BORDER}`,
                          borderRadius: 9,
                          padding: "var(--space-md) var(--space-lg)",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {t("detail.join.cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {membership.state === "gate" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                      {/* eslint-disable-next-line local/no-raw-style-values -- ornament: optical nudge aligning the sparkle glyph to the script cap-height. */}
                      <span style={{ marginTop: 3 }}>
                        <Sparkle size={20} color={IVY} />
                      </span>
                      <span
                        style={{
                          fontFamily: SCRIPT,
                          // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — handwriting on the board, not typeset copy.
                          fontSize: 23,
                          fontWeight: 700,
                          color: ACCENT,
                          lineHeight: 1.2,
                        }}
                      >
                        {t("coven.join.gateTitle")}
                      </span>
                    </div>
                    <div className="content-text" style={{ fontFamily: BODY, lineHeight: 1.55, color: MUTED }}>
                      {t("coven.join.gateBody", { faction: factionName(faction.slug) })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — Witch-of-the-week polaroid + coven roster */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
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
                  // ornament: the polaroid's mat. A thin top/side border against a fat
                  // bottom chin IS the polaroid; the mats are drawn, not layout.
                  // eslint-disable-next-line local/no-raw-style-values -- ornament, per above
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
                {/* eslint-disable-next-line local/no-raw-style-values -- ornament: the polaroid's caption chin, sized with the mat above. */}
                <div style={{ padding: "8px 4px 14px", textAlign: "center" }}>
                  <div style={{ fontFamily: BODY, fontSize: "var(--text-xs)", letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED }}>
                    {t("coven.spotlight.label")}
                  </div>
                  <div
                    style={{
                      fontFamily: SCRIPT,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — handwriting on the board, not typeset copy.
                      fontSize: 26,
                      fontWeight: 700,
                      color: ACCENT,
                      lineHeight: 1,
                    }}
                  >
                    {spot.display_name}
                  </div>
                  <div style={{ fontFamily: BODY, fontSize: "var(--text-sm)", color: INK, marginTop: "var(--space-xs)" }}>
                    {t("coven.spotlight.stat", {
                      level: spot.level,
                      score: spot.all_time_score.toLocaleString(),
                    })}
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
                padding: "var(--space-lg)",
              }}
            >
              <div
                style={{
                  fontFamily: SCRIPT,
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — handwriting on the board, not typeset copy.
                  fontSize: 23,
                  fontWeight: 700,
                  color: ACCENT,
                  lineHeight: 1,
                  marginBottom: "var(--space-sm)",
                }}
              >
                {t("coven.roster.heading")}
              </div>
              {roster.length === 0 ? (
                <p className="content-text" style={{ fontFamily: BODY, color: MUTED }}>
                  {spot
                    ? t("coven.roster.emptyWithSpotlight")
                    : t("detail.membersEmpty")}
                </p>
              ) : (
                roster.map((m) => (
                  <Link
                    key={m.id}
                    to={`/characters/${m.id}`}
                    style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-xs) 0", textDecoration: "none" }}
                  >
                    <Avatar name={m.display_name} size={26} />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: SCRIPT,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat roster name.
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
                    <span style={{ fontFamily: BODY, fontSize: "var(--text-sm)", color: ACCENT }}>
                      {t("coven.roster.level", { level: m.level })}
                    </span>
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
