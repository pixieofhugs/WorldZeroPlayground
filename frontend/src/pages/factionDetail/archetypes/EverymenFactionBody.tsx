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
 * Everymen faction-body — the union / victory-poster skin of the standardized
 * six-section spine (② Charter, ③ The Roll, ④ Tasks, ⑤ Praxis, ⑥ Members).
 * Section ① (hero + side-ledger stats) is EverymenFactionHero, rendered above.
 *
 * Tasks and Praxis reuse the app-wide per-faction cards (TaskCard / PraxisCard
 * already dispatch to the Everymen archetypes) so this file only owns the poster
 * chrome the design adds around them: the two-column layout, the fixed section
 * titles ("Tasks" / "Praxis") with union kickers, the join/gate "Roll" block,
 * the spotlight + roster, and the FDL laurel on the single top-scoring praxis.
 *
 * All colour comes from --everymen-* tokens (dark-mode-aware via the cascade).
 */

const CREAM = "var(--everymen-cream)";
const GOLD = "var(--everymen-gold)";
const INK = "var(--everymen-ink)";
const RED = "var(--everymen-red)";
const MUTED = "var(--everymen-muted)";

const BEBAS = "var(--font-accent)";
const MONO = "var(--font-body)";

/** Paper frame with the design's double-rule (paper halo + ink hairline). */
const PAPER_FRAME: CSSProperties = {
  position: "relative",
  background: CREAM,
  border: `1.5px solid ${INK}`,
  boxShadow: `0 0 0 3px ${CREAM}, 0 0 0 4px ${INK}`,
  overflow: "hidden",
};

/** Faint halftone dot wash for the cream frames. */
function Halftone({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        backgroundImage: `radial-gradient(${INK} 0.6px, transparent 0.7px)`,
        backgroundSize: "4px 4px",
      }}
    />
  );
}

/** Red/gold woven rule that trails the section headings. */
function WovenRule({ height = 3 }: { height?: number }) {
  return (
    <span
      style={{
        flex: 1,
        height,
        minWidth: 30,
        background: `repeating-linear-gradient(90deg, ${RED} 0 16px, ${GOLD} 16px 26px)`,
      }}
    />
  );
}

function SectionHeading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6, flexWrap: "wrap" }}>
      <h2 style={{ fontFamily: BEBAS, fontSize: 34, letterSpacing: "0.04em", margin: 0, color: INK, whiteSpace: "nowrap" }}>
        {children}
      </h2>
      <WovenRule />
      {right}
    </div>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: MUTED, marginBottom: 18 }}>
      {children}
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

/** Circular initials medallion — cream ring / red face (or inverted for the spotlight). */
function Medallion({ name, size, invert = false }: { name: string; size: number; invert?: boolean }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: invert ? CREAM : RED,
        color: invert ? RED : CREAM,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: BEBAS,
        fontSize: size * 0.46,
        boxShadow: invert ? `0 0 0 4px ${INK}, inset 0 0 0 5px ${RED}` : `0 0 0 2px ${INK}`,
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function EverymenFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
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
      <div style={{ display: "flex", flexDirection: "column", gap: 46 }}>
        {/* ② THE CHARTER */}
        <div style={{ ...PAPER_FRAME, padding: "24px 28px 26px" }}>
          <Halftone />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase", color: MUTED }}>
              {t("everymen.charter.heading")}
            </span>
            <span style={{ flex: 1, height: 2, background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)` }} />
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 11 }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} style={{ fontFamily: MONO, fontSize: 12.5, lineHeight: 1.75, color: INK, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p style={{ fontFamily: MONO, fontSize: 12.5, lineHeight: 1.75, color: MUTED, margin: 0 }}>
                {t("everymen.charter.empty")}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>{t("everymen.tasks.heading")}</SectionHeading>
          <Kicker>{t("everymen.tasks.kicker")}</Kicker>
          {tasks.length === 0 ? (
            <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{t("everymen.tasks.empty")}</p>
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
          <SectionHeading>{t("everymen.praxis.heading")}</SectionHeading>
          <Kicker>{t("everymen.praxis.kicker")}</Kicker>
          {recentPraxis.length === 0 ? (
            <p style={{ fontFamily: MONO, fontSize: 11, color: MUTED }}>{t("everymen.praxis.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={44}
                      innerBg={CREAM}
                      glyphColor={INK}
                      rotate="-8deg"
                      shadow="drop-shadow(1.5px 2px 0 color-mix(in srgb, var(--everymen-ink) 30%, transparent))"
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
      <div style={{ display: "flex", flexDirection: "column", gap: 46 }}>
        {/* ③ THE ROLL — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PAPER_FRAME, padding: 0 }}>
            <div style={{ background: RED, color: CREAM, textAlign: "center", padding: "7px 0", fontFamily: BEBAS, fontSize: 16, letterSpacing: "0.16em", borderBottom: `2px solid ${GOLD}` }}>
              {t("everymen.roll.heading")}
            </div>
            <div style={{ position: "relative", padding: "22px 20px" }}>
              <Halftone />
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div style={{ fontFamily: BEBAS, fontSize: 30, lineHeight: 0.9, color: INK }}>
                      {t("everymen.roll.memberTitle")}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: MUTED, margin: "9px 0 0" }}>
                      <Trans t={t} i18nKey="everymen.roll.memberStanding">
                        Standing · <b style={{ color: RED }}>card-carrying</b>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, marginBottom: 5 }}>
                      {t("everymen.roll.eligibleKicker")}
                    </div>
                    <div style={{ fontFamily: BEBAS, fontSize: 32, lineHeight: 0.9, color: INK, marginBottom: 9 }}>
                      {t("everymen.roll.eligibleTitle")}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: INK, marginBottom: 18 }}>
                      {t("everymen.roll.eligibleBody")}
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{ width: "100%", fontFamily: BEBAS, fontSize: 18, letterSpacing: "0.12em", color: CREAM, background: RED, border: "none", padding: 12, boxShadow: `3px 4px 0 ${INK}`, cursor: "pointer" }}
                    >
                      {t("everymen.roll.joinButton")}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.6, color: INK, marginBottom: 14 }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? t("detail.join.confirmSwitch", {
                            faction: faction.name,
                            current: factionName(membership.currentFactionSlug),
                          })
                        : t("detail.join.confirm", { faction: faction.name })}
                    </div>
                    {membership.joinError && (
                      <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--color-danger)", marginBottom: 8 }}>{membership.joinError}</div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{ flex: 1, fontFamily: BEBAS, fontSize: 16, letterSpacing: "0.1em", color: CREAM, background: RED, border: "none", padding: 10, cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        {membership.joining
                          ? t("everymen.roll.joining")
                          : t("everymen.roll.confirmButton")}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, background: "transparent", border: `1.5px solid color-mix(in srgb, ${INK} 30%, transparent)`, padding: "10px 14px", cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        {t("detail.join.cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {membership.state === "gate" && (
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, marginBottom: 5 }}>
                      {t("everymen.roll.gateKicker")}
                    </div>
                    <div style={{ fontFamily: BEBAS, fontSize: 30, lineHeight: 0.92, color: INK, marginBottom: 11 }}>
                      {t("everymen.roll.gateTitle")}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.65, color: INK }}>
                      {t("everymen.roll.gateBody", { faction: faction.name })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — spotlight + roster */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", overflow: "hidden", background: INK, color: CREAM, border: `3px solid ${INK}`, boxShadow: `0 0 0 3px ${GOLD}`, textAlign: "center" }}>
                <div
                  aria-hidden="true"
                  style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5, background: `repeating-conic-gradient(from 0deg at 50% 30%, color-mix(in srgb, var(--everymen-red-deep) 60%, transparent) 0deg 8deg, transparent 8deg 16deg)` }}
                />
                <div style={{ position: "relative", zIndex: 2, padding: "20px 18px 18px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: "0.3em", textTransform: "uppercase", color: GOLD, marginBottom: 12 }}>
                    {t("everymen.spotlight.label")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <Medallion name={spot.display_name} size={74} invert />
                  </div>
                  <div style={{ fontFamily: BEBAS, fontSize: 32, lineHeight: 0.9, color: CREAM, textShadow: "2px 2px 0 rgba(0,0,0,.4)" }}>
                    {spot.display_name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD, marginTop: 6 }}>
                    {t("everymen.spotlight.stat", {
                      level: spot.level,
                      score: spot.all_time_score.toLocaleString(),
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PAPER_FRAME, padding: "16px 18px 12px" }}>
            <Halftone />
            <div style={{ position: "relative", fontFamily: MONO, fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
              {t("everymen.roster.heading")}
            </div>
            {roster.length === 0 ? (
              <p style={{ position: "relative", fontFamily: MONO, fontSize: 11, color: MUTED }}>
                {spot
                  ? t("everymen.roster.emptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              roster.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid color-mix(in srgb, ${INK} 16%, transparent)`, textDecoration: "none" }}
                >
                  <Medallion name={m.display_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: BEBAS, fontSize: 19, lineHeight: 1, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: BEBAS, fontSize: 16, letterSpacing: "0.04em", color: RED }}>
                    {t("everymen.roster.level", { level: m.level })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
