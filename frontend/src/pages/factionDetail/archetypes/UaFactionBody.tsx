import { useState, type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/TaskCard";
import PraxisCard from "../../../components/PraxisCard";
import { TaskCrown } from "../../../components/cards/TaskCrown";
import { toRoman } from "../../../components/cards/ephemeristsAtoms";
import { computeDisplayPoints } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * UA (University of Asthmatics) faction-body — the gilt-salon skin of the
 * standardized six-section spine (② The Practice, ③ The Registry, ④ Tasks,
 * ⑤ Praxis, ⑥ Members). Section ① (hero + side stats) is UaFactionHero above.
 *
 * Same shape as EverymenFactionBody — Tasks/Praxis reuse the app-wide per-faction
 * cards (TaskCard/PraxisCard already dispatch to the UA archetypes); this file
 * owns the salon chrome: the two-column layout, fixed "Tasks"/"Praxis" titles
 * with salon kickers, the enroll/gate registry block, the artist-in-residence
 * spotlight + register, and the FDL laurel on the top-scoring praxis. Levels read
 * as "Anno {roman}". UA has a real dark mode as of #848; the styling of this
 * file is being reworked under #851, which owns everything here except the copy
 * keys.
 */

const PAPER = "var(--faction-ua-card-bg)";
const PAPER_WARM = "var(--ua-paper-warm)";
const INK = "var(--faction-ua-card-text)";
const ACCENT = "var(--faction-ua-card-accent)";
const SUB = "var(--faction-ua-card-muted)";
const MUTED = "var(--ua-muted)";
const GOLD = "var(--ua-gold)";
const GOLD_LT = "var(--ua-gold-lt)";
const GOLD_PALE = "var(--ua-gold-pale)";
const LINE = "var(--ua-line)";
const LINE_SOFT = "var(--ua-line-soft)";
const GILT = "var(--ua-gilt)";

const DISPLAY = "var(--faction-ua-card-font)";
const ENGRAVED = 'var(--faction-ua-body-font)';
const MONO = "var(--font-body)";

/** Parchment card with the salon's inset gold-leaf border. */
const PLATE: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: PAPER,
  border: `1px solid ${LINE}`,
  boxShadow: `0 6px 20px rgba(60,40,10,.09), inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px ${GOLD_PALE}`,
};

/** Faint parchment dot texture. */
function Grain() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage: "radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)",
        backgroundSize: "5px 5px",
      }}
    />
  );
}

const KICKER: CSSProperties = {
  fontFamily: MONO,
  fontSize: "var(--text-xs)",
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: MUTED,
  marginBottom: "var(--space-sm)",
};

function Kicker({ children }: { children: ReactNode }) {
  return <div style={KICKER}>{children}</div>;
}

const SECTION_HEADING_WRAP: CSSProperties = { marginBottom: "var(--space-xl)" };

const SECTION_HEADING_TEXT: CSSProperties = {
  fontFamily: DISPLAY,
  fontStyle: "italic",
  fontWeight: 700,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the salon's engraved plate cut, a step above the content ramp; rounding it to --text-heading would flatten it into the other archetypes.
  fontSize: 30,
  lineHeight: 1,
  color: INK,
  margin: 0,
};

function SectionHeading({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <div style={SECTION_HEADING_WRAP}>
      <Kicker>{kicker}</Kicker>
      <h2 style={SECTION_HEADING_TEXT}>{children}</h2>
    </div>
  );
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";
// "Anno {roman}"; level 0 shows an em-dash, matching the ephemerists convention.
const anno = (level: number) => (level > 0 ? toRoman(level) : "—");

/** Circular initials medallion — parchment face, amber italic glyph. */
function Medallion({ name, size, spotlight = false }: { name: string; size: number; spotlight?: boolean }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: PAPER_WARM,
        border: `${spotlight ? 2 : 1}px solid ${spotlight ? ACCENT : GOLD_LT}`,
        boxShadow: spotlight ? `0 0 0 3px ${PAPER_WARM}, 0 0 0 4px ${GOLD_LT}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: DISPLAY,
        fontStyle: "italic",
        fontWeight: 700,
        fontSize: size * 0.42,
        color: ACCENT,
      }}
    >
      {initial(name)}
    </span>
  );
}

export default function UaFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const register = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ② THE PRACTICE */}
        <div style={{ ...PLATE, padding: "var(--space-xl) var(--space-2xl)" }}>
          <Grain />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
            <span style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.26em", textTransform: "uppercase", color: MUTED }}>
              {t("ua.practice.heading")}
            </span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_LT}, transparent)` }} />
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", lineHeight: 1.75, color: INK, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", lineHeight: 1.75, color: SUB, margin: 0 }}>
                {t("ua.practice.empty")}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading kicker={t("ua.tasks.kicker")}>{t("ua.tasks.heading")}</SectionHeading>
          {tasks.length === 0 ? (
            <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", color: SUB }}>{t("ua.tasks.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start" }}>
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
          <SectionHeading kicker={t("ua.praxis.kicker")}>{t("ua.praxis.heading")}</SectionHeading>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", color: SUB }}>{t("ua.praxis.empty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {/* Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={42}
                      innerBg={PAPER_WARM}
                      glyphColor={INK}
                      rotate="-8deg"
                      shadow="drop-shadow(1.5px 2px 0 rgba(60,40,10,.28))"
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
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ③ THE REGISTRY — enroll / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PLATE, boxShadow: `0 8px 24px rgba(60,40,10,.12), inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px ${GOLD_PALE}`, padding: "var(--space-xl)" }}>
            <Grain />
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
              <span style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.24em", textTransform: "uppercase", color: MUTED }}>
                {t("ua.registry.heading")}
              </span>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_LT}, transparent)` }} />
            </div>
            <div style={{ position: "relative" }}>
              {membership.state === "member" && (
                <div>
                  <div className="content-title" style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, lineHeight: 1, color: INK }}>
                    {t("ua.registry.memberTitle")}
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: "var(--text-xl)", color: SUB, margin: "var(--space-md) 0 0" }}>
                    <Trans t={t} i18nKey="ua.registry.memberStanding">
                      Standing · <span style={{ color: ACCENT }}>enrolled</span>
                    </Trans>
                  </div>
                </div>
              )}

              {membership.state === "eligible" && !confirming && (
                <div>
                  <div style={{ fontFamily: ENGRAVED, fontSize: "var(--text-base)", letterSpacing: "0.1em", color: GOLD, marginBottom: "var(--space-xs)" }}>{t("ua.registry.eligibleKicker")}</div>
                  <div className="content-title" style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, lineHeight: 1.02, color: INK, marginBottom: "var(--space-md)" }}>
                    {t("ua.registry.eligibleTitle")}
                  </div>
                  <div className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", lineHeight: 1.55, color: SUB, marginBottom: "var(--space-lg)" }}>
                    {t("ua.registry.eligibleBody")}
                  </div>
                  <button
                    onClick={() => setConfirming(true)}
                    style={{ width: "100%", fontFamily: ENGRAVED, fontSize: "var(--text-md)", letterSpacing: "0.14em", color: PAPER_WARM, background: ACCENT, border: "none", padding: "var(--space-md)", boxShadow: "0 6px 16px rgba(194,84,31,.28)", cursor: "pointer" }}
                  >
                    {t("ua.registry.joinButton")}
                  </button>
                </div>
              )}

              {membership.state === "eligible" && confirming && (
                <div>
                  <div className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                    {membership.currentFactionSlug &&
                    membership.currentFactionSlug !== "na"
                      ? t("ua.registry.confirmSwitch", {
                          faction: factionName(faction.slug),
                          current: factionName(membership.currentFactionSlug),
                        })
                      : t("ua.registry.confirm", { faction: factionName(faction.slug) })}
                  </div>
                  {membership.joinError && (
                    <div className="content-text" style={{ fontFamily: MONO, color: "var(--color-danger)", marginBottom: "var(--space-sm)" }}>{membership.joinError}</div>
                  )}
                  <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                    <button
                      onClick={() => void membership.join()}
                      disabled={membership.joining}
                      style={{ flex: 1, fontFamily: ENGRAVED, fontSize: "var(--text-md)", letterSpacing: "0.12em", color: PAPER_WARM, background: ACCENT, border: "none", padding: "var(--space-md)", cursor: membership.joining ? "not-allowed" : "pointer" }}
                    >
                      {membership.joining
                        ? t("ua.registry.joining")
                        : t("ua.registry.confirmButton")}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={membership.joining}
                      style={{ fontFamily: ENGRAVED, fontSize: "var(--text-base)", letterSpacing: "0.12em", color: SUB, background: "transparent", border: `1px solid ${LINE}`, padding: "var(--space-md) var(--space-lg)", cursor: membership.joining ? "not-allowed" : "pointer" }}
                    >
                      {t("detail.join.cancel")}
                    </button>
                  </div>
                </div>
              )}

              {membership.state === "gate" && (
                <div>
                  <div style={{ fontFamily: ENGRAVED, fontSize: "var(--text-base)", letterSpacing: "0.1em", color: GOLD, marginBottom: "var(--space-xs)" }}>{t("ua.registry.gateKicker")}</div>
                  <div className="content-title" style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, lineHeight: 1.04, color: INK, marginBottom: "var(--space-md)" }}>
                    {t("ua.registry.gateTitle")}
                  </div>
                  <div className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", lineHeight: 1.65, color: SUB }}>
                    {t("ua.registry.gateBody", { faction: factionName(faction.slug) })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — artist in residence + the register */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              {/* gilt sandwich frame */}
              <div style={{ padding: "var(--space-md)", background: GILT, boxShadow: "0 12px 28px rgba(60,40,10,.22), inset 0 0 0 1px rgba(255,255,255,.45)" }}>
                <div style={{ padding: "var(--space-xs)", background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})` }}>
                  <div style={{ background: PAPER_WARM, border: `1px solid ${LINE}`, padding: "var(--space-xl) var(--space-lg) var(--space-lg)", textAlign: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.3em", textTransform: "uppercase", color: MUTED, marginBottom: "var(--space-md)" }}>
                      {t("ua.spotlight.label")}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                      <Medallion name={spot.display_name} size={72} spotlight />
                    </div>
                    <div className="content-title" style={{ fontFamily: DISPLAY, fontStyle: "italic", fontWeight: 700, lineHeight: 1, color: INK }}>
                      {spot.display_name}
                    </div>
                    <div style={{ fontFamily: ENGRAVED, fontSize: "var(--text-xs)", letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginTop: "var(--space-sm)" }}>
                      {t("ua.spotlight.stat", {
                        anno: anno(spot.level),
                        score: spot.all_time_score.toLocaleString(),
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PLATE, boxShadow: `0 4px 14px rgba(60,40,10,.08), inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px ${GOLD_PALE}`, padding: "var(--space-lg) var(--space-xl) var(--space-lg)" }}>
            <Grain />
            <div style={{ position: "relative", fontFamily: MONO, fontSize: "var(--text-xs)", letterSpacing: "0.24em", textTransform: "uppercase", color: MUTED, marginBottom: "var(--space-md)" }}>
              {t("ua.roster.heading")}
            </div>
            {register.length === 0 ? (
              <p className="content-text" style={{ position: "relative", fontFamily: DISPLAY, fontStyle: "italic", color: SUB }}>
                {spot
                  ? t("ua.roster.emptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              register.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0", borderBottom: `1px solid ${LINE_SOFT}`, textDecoration: "none" }}
                >
                  <Medallion name={m.display_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="content-text" style={{ fontFamily: DISPLAY, fontStyle: "italic", color: INK, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: ENGRAVED, fontSize: "var(--text-sm)", letterSpacing: "0.08em", color: GOLD }}>
                    {t("ua.roster.level", { anno: anno(m.level) })}
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
