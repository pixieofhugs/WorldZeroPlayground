import { useState, type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { TaskCrown } from "../../../components/cards/TaskCrown";
import { computeDisplayPoints } from "../../../utils/points";
import { factionName } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * S.N.I.D.E. faction-body — the ransom-dispatch skin of the standardized
 * six-section spine (② About, ③ Re: You, ④ Tasks, ⑤ Praxis, ⑥ Members).
 * Section ① (hero + side stat chits) is SnideFactionHero, rendered above.
 *
 * Same shape as Everymen/UaFactionBody — Tasks/Praxis reuse the app-wide
 * per-faction cards (TaskCard/PraxisCard already dispatch to the SNIDE
 * archetypes); this file only owns the cut-and-paste chrome the design adds:
 * the two-column layout, taped photocopier frames, halftone dots, the fixed
 * "Tasks"/"Praxis" titles with marker kickers, the join/gate "re: you"
 * dispatch, the "WANTED" spotlight + dashed "rap sheet", and the FDL laurel on
 * the single top-scoring praxis.
 *
 * SNIDE is ALWAYS DARK and self-contained — all colour comes from the
 * --faction-snide-* tokens (never mutates data-theme).
 */

const ACID = "var(--faction-snide-acid)";
// ponytail: design's #16a34a marker-green has no dedicated token; --faction-snide-acid-deep
// (#6fae00) is the nearest namespaced green and reads correctly on the always-dark ink.
const GREEN = "var(--faction-snide-acid-deep)";
const INK = "var(--faction-snide-ink)";
const PAPER = "var(--faction-snide-paper)";
const PINK = "var(--faction-snide-pink)";
const PINK_DEEP = "var(--faction-snide-pink-deep)";
const TAPE = "var(--faction-snide-tape)";
const MUTED = "var(--faction-snide-card-muted)";

const IMPACT = "var(--faction-snide-font-impact)";
const COND = "var(--faction-snide-font-cond)";
const BLACK = "var(--faction-snide-font-black)";
const TYPE = "var(--faction-snide-font-type)";
const MARKER = "var(--faction-snide-font-marker)";
const MONO = "var(--font-body)";

/** Photocopier-ink panel (dark card on the wall). */
const INK_PANEL: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: INK,
  color: "#fff",
  border: "1px solid color-mix(in srgb, var(--faction-snide-acid) 18%, transparent)",
  boxShadow: "6px 8px 0 rgba(0,0,0,0.45)",
};

/** Warm xerox-paper panel (light card on the wall). */
const PAPER_PANEL: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: PAPER,
  color: INK,
  border: `1.5px solid ${INK}`,
  boxShadow: "4px 6px 0 rgba(0,0,0,0.22)",
};

/** Faint halftone dot wash — acid on ink, or ink on paper. */
function Halftone({ on = "ink" }: { on?: "ink" | "paper" }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
          on === "ink"
            ? "radial-gradient(color-mix(in srgb, var(--faction-snide-acid) 8%, transparent) 32%, transparent 34%)"
            : "radial-gradient(color-mix(in srgb, var(--faction-snide-ink) 5%, transparent) 32%, transparent 34%)",
        backgroundSize: "5px 5px",
      }}
    />
  );
}

/** A strip of packing tape slapped across a corner. */
function Tape({ style }: { style: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        height: 26,
        width: 66,
        background: TAPE,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
        zIndex: 3,
        ...style,
      }}
    />
  );
}

/** Acid section title (skewed) trailing a green/pink barcode rule. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
      <span
        style={{
          fontFamily: IMPACT,
          fontSize: 30,
          letterSpacing: "0.02em",
          color: ACID,
          textTransform: "uppercase",
          transform: "skewX(-5deg)",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
      <span
        style={{
          flex: 1,
          height: 4,
          minWidth: 40,
          background: `repeating-linear-gradient(90deg, ${GREEN} 0 14px, ${PINK} 14px 22px, transparent 22px 30px)`,
        }}
      />
    </div>
  );
}

/** Scrawled marker kicker. */
function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: MARKER, fontSize: 16, color: PINK, transform: "rotate(-1deg)", marginBottom: 18 }}>
      {children}
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** Struck initials chip — ink face, acid glyph (or inverted for the spotlight). */
function Mugshot({ name, size, invert = false }: { name: string; size: number; invert?: boolean }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: invert ? PAPER : INK,
        color: invert ? INK : ACID,
        border: `${invert ? 2 : 1.5}px solid ${GREEN}`,
        boxShadow: invert ? `0 0 0 3px ${INK}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: IMPACT,
        fontSize: size * 0.46,
        transform: "rotate(-3deg)",
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function SnideFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  // ② about paragraphs — split the single description on blank lines.
  const paragraphs = (faction.description ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; rap sheet = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const rapSheet = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        {/* ② ABOUT — taped xerox flyer */}
        <div style={{ position: "relative", transform: "rotate(-0.6deg)" }}>
          <Tape style={{ top: -11, left: 28, transform: "rotate(-7deg)" }} />
          <Tape style={{ top: -9, right: 32, transform: "rotate(6deg)" }} />
          <div style={{ ...PAPER_PANEL, padding: "22px 26px" }}>
            <Halftone on="paper" />
            <div
              style={{
                position: "relative",
                fontFamily: MARKER,
                fontSize: 26,
                color: GREEN,
                transform: "rotate(-1deg)",
                marginBottom: 12,
              }}
            >
              {t("snide.about.heading")}
            </div>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
              {paragraphs.length ? (
                paragraphs.map((para, i) => (
                  <p key={i} style={{ fontFamily: TYPE, fontSize: 12, lineHeight: 1.75, color: INK, margin: 0 }}>
                    {para}
                  </p>
                ))
              ) : (
                <p style={{ fontFamily: TYPE, fontSize: 12, lineHeight: 1.75, color: "color-mix(in srgb, var(--faction-snide-ink) 60%, transparent)", margin: 0 }}>
                  {t("snide.about.empty")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>{t("snide.tasks.heading")}</SectionHeading>
          <Kicker>{t("snide.tasks.kicker")}</Kicker>
          {tasks.length === 0 ? (
            <p style={{ fontFamily: TYPE, fontSize: 12, color: MUTED }}>{t("snide.tasks.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
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
          <SectionHeading>{t("snide.praxis.heading")}</SectionHeading>
          <Kicker>{t("snide.praxis.kicker")}</Kicker>
          {recentPraxis.length === 0 ? (
            <p style={{ fontFamily: TYPE, fontSize: 12, color: MUTED }}>{t("snide.praxis.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={48}
                      innerBg={PAPER}
                      glyphColor={INK}
                      rotate="-8deg"
                      shadow="drop-shadow(2px 2px 0 rgba(0,0,0,.35))"
                      style={{ position: "absolute", top: -12, right: -8, zIndex: 5 }}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        {/* ③ RE: YOU — join / gate / standing (taped dispatch) */}
        {membership.state !== "none" && (
          <div style={{ position: "relative", transform: "rotate(-1deg)" }}>
            <Tape style={{ top: -10, left: "50%", marginLeft: -30, width: 60, transform: "rotate(-5deg)" }} />
            <div style={{ ...INK_PANEL, padding: "22px 20px" }}>
              <Halftone on="ink" />
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderBottom: `2px solid ${ACID}`,
                  paddingBottom: 6,
                  marginBottom: 16,
                }}
              >
                <span style={{ fontFamily: COND, fontSize: 14, letterSpacing: "0.22em", color: ACID }}>
                  {t("snide.dispatch.letterhead")}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: MUTED }}>
                  {t("snide.dispatch.reLabel")}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div style={{ fontFamily: IMPACT, fontSize: 26, lineHeight: 0.9, color: ACID, textTransform: "uppercase" }}>
                      {t("snide.dispatch.memberTitle")}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED, margin: "9px 0 0" }}>
                      <Trans t={t} i18nKey="snide.dispatch.memberStanding">
                        Standing · <b style={{ color: PINK }}>accomplice</b>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div style={{ fontFamily: MARKER, fontSize: 16, color: PINK, transform: "rotate(-1.5deg)", marginBottom: 6 }}>
                      {t("snide.dispatch.eligibleKicker")}
                    </div>
                    <div style={{ fontFamily: IMPACT, fontSize: 24, lineHeight: 0.9, color: ACID, textTransform: "uppercase", marginBottom: 8 }}>
                      {t("snide.dispatch.eligibleTitle")}
                    </div>
                    <div style={{ fontFamily: TYPE, fontSize: 10.5, lineHeight: 1.5, color: "#d8d6c8", marginBottom: 16 }}>
                      {t("snide.dispatch.eligibleBody")}
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{
                        width: "100%",
                        background: PINK,
                        color: "#fff",
                        fontFamily: BLACK,
                        fontSize: 14,
                        padding: 12,
                        border: "none",
                        transform: "rotate(-1deg)",
                        boxShadow: "3px 4px 0 rgba(0,0,0,.4)",
                        cursor: "pointer",
                      }}
                    >
                      {t("snide.dispatch.joinButton")}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div style={{ fontFamily: TYPE, fontSize: 11, lineHeight: 1.6, color: "#e7e4d8", marginBottom: 14 }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? t("detail.join.confirmSwitch", {
                            faction: faction.name,
                            current: factionName(membership.currentFactionSlug),
                          })
                        : t("detail.join.confirm", { faction: faction.name })}
                    </div>
                    {membership.joinError && (
                      <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--color-danger)", marginBottom: 8 }}>
                        {membership.joinError}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{
                          flex: 1,
                          background: PINK,
                          color: "#fff",
                          fontFamily: BLACK,
                          fontSize: 13,
                          padding: 11,
                          border: "none",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {membership.joining
                          ? t("snide.dispatch.joining")
                          : t("snide.dispatch.confirmButton")}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{
                          fontFamily: COND,
                          fontSize: 13,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: MUTED,
                          background: "transparent",
                          border: "2px dashed color-mix(in srgb, var(--faction-snide-card-muted) 45%, transparent)",
                          padding: "10px 14px",
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
                    <div style={{ fontFamily: MARKER, fontSize: 16, color: PINK, transform: "rotate(-1.5deg)", marginBottom: 6 }}>
                      {t("snide.dispatch.gateKicker")}
                    </div>
                    <div style={{ fontFamily: IMPACT, fontSize: 24, lineHeight: 0.9, color: ACID, textTransform: "uppercase", marginBottom: 10 }}>
                      {t("snide.dispatch.gateTitle")}
                    </div>
                    <div style={{ fontFamily: TYPE, fontSize: 10.5, lineHeight: 1.6, color: "#d8d6c8" }}>
                      {t("snide.dispatch.gateBody", { faction: faction.name })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — WANTED spotlight + dashed rap sheet */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", transform: "rotate(1.2deg)" }}>
                <Tape style={{ top: -9, left: 26, width: 56, height: 22, transform: "rotate(-6deg)" }} />
                <div style={{ ...INK_PANEL, border: `2px solid ${ACID}`, boxShadow: "5px 6px 0 rgba(0,0,0,.3)", padding: "18px 16px 16px", textAlign: "center" }}>
                  <Halftone on="ink" />
                  <div style={{ position: "relative", fontFamily: COND, fontSize: 13, letterSpacing: "0.35em", color: PINK }}>
                    {t("snide.spotlight.wanted")}
                  </div>
                  <div style={{ position: "relative", fontFamily: MARKER, fontSize: 13, color: ACID, transform: "rotate(-2deg)", marginBottom: 10 }}>
                    {t("snide.spotlight.label")}
                  </div>
                  <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 10 }}>
                    <Mugshot name={spot.display_name} size={70} invert />
                  </div>
                  <div style={{ position: "relative", fontFamily: IMPACT, fontSize: 30, lineHeight: 0.9, color: ACID, textTransform: "uppercase" }}>
                    {spot.display_name}
                  </div>
                  <div style={{ position: "relative", fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#cfcdbf", marginTop: 4 }}>
                    {t("snide.spotlight.stat", {
                      level: spot.level,
                      score: spot.all_time_score.toLocaleString(),
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ position: "relative", transform: "rotate(-0.6deg)" }}>
            <div style={{ ...PAPER_PANEL, boxShadow: "4px 5px 0 rgba(0,0,0,.2)", padding: "16px 16px 12px" }}>
              <Halftone on="paper" />
              <div style={{ position: "relative", fontFamily: MARKER, fontSize: 22, color: GREEN, transform: "rotate(-1deg)", marginBottom: 10 }}>
                {t("snide.roster.heading")}
              </div>
              {rapSheet.length === 0 ? (
                <p style={{ position: "relative", fontFamily: TYPE, fontSize: 12, color: "color-mix(in srgb, var(--faction-snide-ink) 60%, transparent)" }}>
                  {spot
                    ? t("snide.roster.emptyWithSpotlight")
                    : t("detail.membersEmpty")}
                </p>
              ) : (
                rapSheet.map((m) => (
                  <Link
                    key={m.id}
                    to={`/characters/${m.id}`}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "7px 0",
                      borderBottom: "1px dashed color-mix(in srgb, var(--faction-snide-ink) 22%, transparent)",
                      textDecoration: "none",
                    }}
                  >
                    <Mugshot name={m.display_name} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: MARKER, fontSize: 16, color: INK, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.display_name}
                      </div>
                    </div>
                    <span style={{ fontFamily: COND, fontSize: 13, letterSpacing: "0.06em", color: PINK_DEEP }}>
                      {t("snide.roster.level", { level: m.level })}
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
