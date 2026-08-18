import { useState, type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
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
/**
 * Text on the PAGE, which is `.em-backdrop` — the paper, not the cream (#2133).
 *
 * `INK` is a near-black in both themes, which is right on the cream frames and
 * on the gold: those stocks are theme-invariant. The page under them is not —
 * it ramps `--everymen-paper` to `--everymen-paper-deep`, and both flip. So the
 * two section headings, the only type this file sets outside a frame, were
 * reading 1.16:1 at night while measuring 13.19:1 by day, because the two
 * tokens are the same hex in light. `--everymen-paper-text` is the ink that
 * flips with the stock: 13.19 / 13.96 on the paper, 11.02 / 15.26 on the deep.
 */
const PAPER_TEXT = "var(--everymen-paper-text)";
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

const SECTION_HEADING_ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-lg)",
  marginBottom: "var(--space-sm)",
  flexWrap: "wrap",
};

const SECTION_HEADING_TEXT: CSSProperties = {
  fontFamily: BEBAS,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: victory-poster display cut in condensed Bebas — poster type, not a read heading.
  fontSize: 34,
  letterSpacing: "0.04em",
  margin: 0,
  // The heading stands on the page, not in a frame — see `PAPER_TEXT` (#2133).
  color: PAPER_TEXT,
  whiteSpace: "nowrap",
};

function SectionHeading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={SECTION_HEADING_ROW}>
      <h2 style={SECTION_HEADING_TEXT}>{children}</h2>
      <WovenRule />
      {right}
    </div>
  );
}

/* The union `Kicker` under each section title lived here. #1909 cut its two
   strings (`everymen.tasks.kicker` / `.praxis.kicker`): the audit ruled the line
   restated its own heading, and no faction outside the seven bespoke bodies ever
   had one. The style went with the only component that used it. */

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

  // The burn (#1305) — this viewer left this faction this era, so
  // `can_join_faction` refuses the join for the rest of it. It reuses the
  // gate's chassis below: only the words change, and they are neutral
  // platform copy (ADR-0061) because this is the platform speaking.
  const burned = membership.state === "burned";

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
        {/* ② THE CHARTER */}
        <div style={{ ...PAPER_FRAME, padding: "var(--space-xl) var(--space-2xl)" }}>
          <Halftone />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
            <span style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.24em", textTransform: "uppercase", color: MUTED }}>
              {t("detail.aboutHeading")}
            </span>
            <span style={{ flex: 1, height: 2, background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)` }} />
          </div>
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} className="content-text" style={{ fontFamily: MONO, lineHeight: 1.75, color: INK, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p className="content-text" style={{ fontFamily: MONO, lineHeight: 1.75, color: MUTED, margin: 0 }}>
                {t("detail.descriptionEmpty")}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>{t("detail.default.tasksHeading", { total: tasks.length })}</SectionHeading>
          {tasks.length === 0 ? (
            <p className="content-text" style={{ fontFamily: MONO, color: MUTED }}>{t("detail.default.tasksEmpty")}</p>
          ) : (
            <div className="task-card-row" style={{ gap: "var(--space-xl)" }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={computeFactionMultiplier(
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
          <SectionHeading>{t("detail.default.recentHeading")}</SectionHeading>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ fontFamily: MONO, color: MUTED }}>{t("detail.default.recentEmpty")}</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "1 1 280px", minWidth: 280 }}>
                  {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                      so the card's built-in stamp is suppressed. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={44}
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
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ③ THE ROLL — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...PAPER_FRAME, padding: 0 }}>
            <div
              style={{
                background: RED,
                color: CREAM,
                textAlign: "center",
                padding: "var(--space-sm) 0",
                fontFamily: BEBAS,
                // eslint-disable-next-line local/no-raw-style-values -- ornament: printed banner across the top of the roll — Bebas poster furniture.
                fontSize: 16,
                letterSpacing: "0.16em",
                borderBottom: `2px solid ${GOLD}`,
              }}
            >
              {t("everymen.roll.heading")}
            </div>
            <div style={{ position: "relative", padding: "var(--space-xl)" }}>
              <Halftone />
              <div style={{ position: "relative" }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas poster headline set tight (lineHeight 0.9).
                        fontSize: 30,
                        lineHeight: 0.9,
                        color: INK,
                      }}
                    >
                      {t("everymen.roll.memberTitle")}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", color: MUTED, margin: "var(--space-sm) 0 0" }}>
                      <Trans t={t} i18nKey="everymen.roll.memberStanding">
                        Standing · <b style={{ color: RED }}>card-carrying</b>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, marginBottom: "var(--space-xs)" }}>
                      {t("everymen.roll.eligibleKicker")}
                    </div>
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas poster headline set tight (lineHeight 0.9).
                        fontSize: 32,
                        lineHeight: 0.9,
                        color: INK,
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {t("everymen.roll.eligibleTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: MONO, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                      {t("everymen.roll.eligibleBody")}
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{
                        width: "100%",
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas is a condensed poster face — its optical size is not the text scale.
                        fontSize: 18,
                        letterSpacing: "0.12em",
                        color: CREAM,
                        background: RED,
                        border: "none",
                        padding: "var(--space-md)",
                        boxShadow: `3px 4px 0 ${INK}`,
                        cursor: "pointer",
                      }}
                    >
                      {t("everymen.roll.joinButton")}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div className="content-text" style={{ fontFamily: MONO, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? t("detail.join.confirmSwitch", {
                            faction: factionName(faction.slug),
                            current: factionName(membership.currentFactionSlug),
                          })
                        : t("detail.join.confirm", { faction: factionName(faction.slug) })}
                    </div>
                    {membership.joinError && (
                      <div className="content-text" style={{ fontFamily: MONO, color: "var(--color-danger)", marginBottom: "var(--space-sm)" }}>{membership.joinError}</div>
                    )}
                    <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{
                          flex: 1,
                          fontFamily: BEBAS,
                          // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas is a condensed poster face — its optical size is not the text scale.
                          fontSize: 16,
                          letterSpacing: "0.1em",
                          color: CREAM,
                          background: RED,
                          border: "none",
                          padding: "var(--space-md)",
                          cursor: membership.joining ? "not-allowed" : "pointer",
                        }}
                      >
                        {membership.joining
                          ? t("everymen.roll.joining")
                          : t("mobile.confirm")}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{ fontFamily: MONO, fontSize: "var(--text-md)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, background: "transparent", border: `1.5px solid color-mix(in srgb, ${INK} 30%, transparent)`, padding: "var(--space-md) var(--space-lg)", cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        {t("detail.join.cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, marginBottom: "var(--space-xs)" }}>
                      {burned
                        ? t("detail.burned.kicker")
                        : t("everymen.roll.gateKicker")}
                    </div>
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Bebas poster headline set tight (lineHeight 0.92).
                        fontSize: 30,
                        lineHeight: 0.92,
                        color: INK,
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("everymen.roll.gateTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: MONO, lineHeight: 1.65, color: INK }}>
                      {burned
                        ? t("detail.burned.body", { faction: factionName(faction.slug) })
                        : t("mobile.gateHint", { faction: factionName(faction.slug) })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — spotlight + roster */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ position: "relative", overflow: "hidden", background: INK, color: CREAM, border: `3px solid ${INK}`, boxShadow: `0 0 0 3px ${GOLD}`, textAlign: "center" }}>
                <div
                  aria-hidden="true"
                  style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5, background: `repeating-conic-gradient(from 0deg at 50% 30%, color-mix(in srgb, var(--everymen-red-deep) 60%, transparent) 0deg 8deg, transparent 8deg 16deg)` }}
                />
                <div style={{ position: "relative", zIndex: 2, padding: "var(--space-xl) var(--space-lg) var(--space-lg)" }}>
                  <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.3em", textTransform: "uppercase", color: GOLD, marginBottom: "var(--space-md)" }}>
                    {t("everymen.spotlight.label")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                    <Medallion name={spot.display_name} size={74} invert />
                  </div>
                  <div
                    style={{
                      fontFamily: BEBAS,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the spotlight's printed name plate, Bebas on the sunburst.
                      fontSize: 32,
                      lineHeight: 0.9,
                      color: CREAM,
                      // The Everymen poster drop shadow, struck from the ink
                      // its four sibling surfaces already use (#1609).
                      textShadow: `2px 2px 0 color-mix(in srgb, ${INK} 40%, transparent)`,
                    }}
                  >
                    {spot.display_name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD, marginTop: "var(--space-sm)" }}>
                    {t("detail.spotlightStat", {
                      level: spot.level,
                      score: spot.all_time_score.toLocaleString(),
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...PAPER_FRAME, padding: "var(--space-lg) var(--space-lg) var(--space-md)" }}>
            <Halftone />
            <div style={{ position: "relative", fontFamily: MONO, fontSize: "var(--text-md)", letterSpacing: "0.22em", textTransform: "uppercase", color: MUTED, marginBottom: "var(--space-md)" }}>
              {t("detail.default.membersHeading", { total: members.length })}
            </div>
            {roster.length === 0 ? (
              <p className="content-text" style={{ position: "relative", fontFamily: MONO, color: MUTED }}>
                {spot
                  ? t("detail.membersEmptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              roster.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0", borderBottom: `1px solid color-mix(in srgb, ${INK} 16%, transparent)`, textDecoration: "none" }}
                >
                  <Medallion name={m.display_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: BEBAS,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: roster set in condensed Bebas — its optical size is not the text scale.
                        fontSize: 19,
                        lineHeight: 1,
                        color: INK,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.display_name}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: BEBAS,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: roster set in condensed Bebas — its optical size is not the text scale.
                      fontSize: 16,
                      letterSpacing: "0.04em",
                      color: RED,
                    }}
                  >
                    {t("detail.memberLevel", { level: m.level })}
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
