import { useState, type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import { EphemeristsSigil } from "../../../components/sigil/EphemeristsSigil";
import {
  AuthorOctagon,
  BAND,
  BAND_INK,
  BAND_QUIET,
  BRASS,
  BRASS_LIGHT,
  CAPS,
  CAPTION,
  CTA_BG,
  CTA_INK,
  DECO,
  RuneRule,
  GOLD,
  INK,
  LINE,
  MARGINALIA,
  NILE,
  QUIET,
  READING,
  RULE,
  SHADOW,
  SMALL_CAPS,
  Tally,
  PLATE as SHEET,
} from "../../../components/factionMarks/ephemeristsPlate";
import { toRoman } from "../../../utils/roman";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Ephemerists faction-body — the VALLEY CARD skin of the
 * standardized six-section spine (② The Apparatus, ③ The Road, ④ Tasks,
 * ⑤ Praxis, ⑥ Members). Section ① (hero + side-ledger stats) is
 * EphemeristsFactionHero, rendered above.
 *
 * Same shape as Everymen/UaFactionBody — Tasks/Praxis reuse the app-wide
 * per-faction cards (TaskCard/PraxisCard already dispatch to the Ephemerists
 * archetypes); this file only owns the chrome the design adds around them: the
 * two-column layout, the fixed "Tasks"/"Praxis" titles with marginalia kickers,
 * the join/gate "Road" block, the keeper spotlight + roster, and the FDL laurel
 * on the single top-scoring praxis. Levels read as Roman numerals.
 *
 * SWEPT OFF THE CODEX (#1208). Every mark is the plate kit's rather than a
 * private drawing: the roster's circular vellum medallions are `AuthorOctagon`,
 * the level beside a keeper's name gains the `Tally`, and every section rule is
 * `RuneRule`. Two grounds carry ink here — the plate (`ink` 11.3:1, `quiet`
 * 5.6, `caption` 4.8, `nile` 5.0) and the night band under the spotlight
 * (`band-ink` 12.4, `gold` 9.4, `band-quiet` 8.6). The page beneath both is
 * `.eph-backdrop`, repainted onto `-plate-page` in the same issue; only `ink`,
 * `quiet` and `nile` clear on it, which is why no caption sits directly on it.
 */

/** One plate off the field journal, at the weight the design draws it. */
const CARD: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: SHEET,
  border: `1px solid ${LINE}`,
  boxShadow: SHADOW,
};

const KICKER: CSSProperties = {
  fontFamily: MARGINALIA,
  fontStyle: "italic",
  // eslint-disable-next-line local/no-raw-style-values -- ornament: marginal gloss under the section title, not copy.
  fontSize: 13,
  // The PAGE's ink, not the plate's (#1675). See SECTION_HEADING below.
  color: "var(--color-text-secondary)",
  margin: "var(--space-xs) 0 var(--space-lg)",
};

function Kicker({ children }: { children: ReactNode }) {
  return <div style={KICKER}>{children}</div>;
}

const SECTION_HEADING: CSSProperties = {
  fontFamily: DECO,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's display cut, a step above the content ramp.
  fontSize: 30,
  letterSpacing: "0.04em",
  margin: 0,
  /**
   * THE PAGE'S INK, NOT THE PLATE'S (#1675).
   *
   * `INK` is `-plate-ink`, #f0e6c8 — a cream cut for the night plate the CARDs
   * paint (`-plate-bg`, #171a26), where it measures 11.3:1. The section titles
   * and their kickers are the two things on this page that sit OUTSIDE a card,
   * so in light mode they landed cream-on-cream at **1.13:1** against 3:1 — a
   * 30px heading effectively invisible, on every section, since #1023.
   *
   * The header above this file says "the page beneath both is `.eph-backdrop`",
   * and that is the assumption that rotted: nothing applies `.eph-backdrop`
   * here. The root is a bare `.wz-faction-grid`, so the ground is the app's, and
   * the ink has to be the app's too. Both tokens flip through the
   * `[data-theme="dark"]` cascade, which is why dark mode never showed this.
   */
  color: "var(--color-text-primary)",
};

/** Section title in the plate's display face, over the design's fluted rule. */
function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <>
      <h2 style={SECTION_HEADING}>{children}</h2>
      <RuneRule />
    </>
  );
}

// "level {roman}"; level 0 shows an em-dash, matching the ephemerists convention.
const romanLevel = (level: number) => (level > 0 ? toRoman(level) : "—");

/**
 * A keeper's monogram. The codex struck these as circular vellum medallions;
 * the plate cuts corners, so this is the kit's `AuthorOctagon` at whatever size
 * the slot asks for — the same cartouche the roster rows in the design use.
 */
function Medallion({ name, size }: { name: string; size: number }) {
  return <AuthorOctagon name={name} size={size} fontSize={size * 0.4} />;
}

export default function EphemeristsFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const { faction, members, tasks, recentPraxis, viewerFactionSlug, gameFactions, membership } = state;
  const [confirming, setConfirming] = useState(false);

  if (!faction) return null;

  // The burn (#1305) — this viewer left this faction this era, so
  // `can_join_faction` refuses the join for the rest of it. It reuses the
  // gate's chassis below: only the words change, and they are neutral
  // platform copy (ADR-0061) because this is the platform speaking.
  const burned = membership.state === "burned";

  // ② apparatus paragraphs — split the single description on blank lines.
  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ⑥ spotlight = highest all-time score; roster = the rest.
  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid">
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ② THE APPARATUS */}
        <div style={{ ...CARD, padding: "var(--space-xl) var(--space-2xl)" }}>
          <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
            <EphemeristsSigil size={15} color={BRASS} />
            <span style={{ ...SMALL_CAPS, fontWeight: 600, fontSize: "var(--text-md)", letterSpacing: "0.22em", color: CAPTION }}>
              {t("ephemerists.apparatus.heading")}
            </span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${BRASS}, transparent)` }} />
          </div>
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {paragraphs.length ? (
              paragraphs.map((para, i) => (
                <p key={i} className="content-text" style={{ fontFamily: READING, lineHeight: 1.78, color: INK, margin: 0 }}>
                  {para}
                </p>
              ))
            ) : (
              <p className="content-text" style={{ fontFamily: READING, lineHeight: 1.78, color: QUIET, margin: 0 }}>
                {t("ephemerists.apparatus.empty")}
              </p>
            )}
          </div>
        </div>

        {/* ④ TASKS */}
        <div>
          <SectionHeading>{t("ephemerists.tasks.heading")}</SectionHeading>
          <Kicker>{t("ephemerists.tasks.kicker")}</Kicker>
          {tasks.length === 0 ? (
            <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: "italic", color: QUIET }}>
              {t("ephemerists.tasks.empty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start" }}>
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
          <SectionHeading>{t("ephemerists.praxis.heading")}</SectionHeading>
          <Kicker>{t("ephemerists.praxis.kicker")}</Kicker>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ fontFamily: MARGINALIA, fontStyle: "italic", color: QUIET }}>
              {t("ephemerists.praxis.empty")}
            </p>
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
                      shadow={`drop-shadow(1.5px 2px 0 color-mix(in srgb, ${INK} 28%, transparent))`}
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
        {/* ③ THE ROAD — join / gate / standing */}
        {membership.state !== "none" && (
          <div style={{ ...CARD, padding: 0 }}>
            <div style={{ background: BAND, color: BAND_INK, padding: "var(--space-sm) var(--space-lg)", fontFamily: CAPS, fontWeight: 600, fontSize: "var(--text-lg)", letterSpacing: "0.2em", textTransform: "uppercase", boxShadow: `inset 0 -2px 0 ${BRASS}` }}>
              {t("ephemerists.road.heading")}
            </div>
            <div style={{ position: "relative", padding: "var(--space-xl)" }}>
              <div style={{ position: "relative", zIndex: 2 }}>
                {membership.state === "member" && (
                  <div>
                    <div
                      style={{
                        fontFamily: CAPS,
                        fontWeight: 700,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Cinzel codex display title.
                        fontSize: 22,
                        lineHeight: 1.02,
                        color: INK,
                      }}
                    >
                      {t("ephemerists.road.memberTitle")}
                    </div>
                    <div style={{ fontFamily: READING, fontSize: "var(--text-xl)", color: QUIET, margin: "var(--space-md) 0 0" }}>
                      <Trans t={t} i18nKey="ephemerists.road.memberStanding">
                        Standing · <span style={{ fontStyle: "italic", color: NILE }}>keeper of the road</span>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && !confirming && (
                  <div>
                    <div
                      style={{
                        fontFamily: MARGINALIA,
                        fontStyle: "italic",
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: calligraphic flourish above the codex title.
                        fontSize: 13,
                        color: CAPTION,
                        marginBottom: "var(--space-xs)",
                      }}
                    >
                      {t("ephemerists.road.eligibleKicker")}
                    </div>
                    <div
                      style={{
                        fontFamily: CAPS,
                        fontWeight: 700,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Cinzel codex display title.
                        fontSize: 23,
                        lineHeight: 1.02,
                        color: INK,
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {t("ephemerists.road.eligibleTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: READING, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                      {t("ephemerists.road.eligibleBody")}
                    </div>
                    <button
                      onClick={() => setConfirming(true)}
                      style={{ width: "100%", ...SMALL_CAPS, fontSize: "var(--text-xl)", letterSpacing: "0.14em", color: CTA_INK, background: CTA_BG, border: `2px solid ${BRASS}`, padding: "var(--space-md)", cursor: "pointer" }}
                    >
                      {t("ephemerists.road.joinButton")}
                    </button>
                  </div>
                )}

                {membership.state === "eligible" && confirming && (
                  <div>
                    <div className="content-text" style={{ fontFamily: READING, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                      {membership.currentFactionSlug &&
                      membership.currentFactionSlug !== "na"
                        ? t("detail.join.confirmSwitch", {
                            faction: factionName(faction.slug),
                            current: factionName(membership.currentFactionSlug),
                          })
                        : t("detail.join.confirm", { faction: factionName(faction.slug) })}
                    </div>
                    {membership.joinError && (
                      <div className="content-text" style={{ fontFamily: READING, color: "var(--color-danger)", marginBottom: "var(--space-sm)" }}>{membership.joinError}</div>
                    )}
                    <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                      <button
                        onClick={() => void membership.join()}
                        disabled={membership.joining}
                        style={{ flex: 1, ...SMALL_CAPS, fontSize: "var(--text-lg)", letterSpacing: "0.12em", color: CTA_INK, background: CTA_BG, border: `2px solid ${BRASS}`, padding: "var(--space-md)", cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        {membership.joining
                          ? t("ephemerists.road.joining")
                          : t("ephemerists.road.confirmButton")}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={membership.joining}
                        style={{ fontFamily: MARGINALIA, fontStyle: "italic", fontSize: "var(--text-lg)", letterSpacing: "0.06em", color: QUIET, background: "transparent", border: `1px solid ${LINE}`, padding: "var(--space-md) var(--space-lg)", cursor: membership.joining ? "not-allowed" : "pointer" }}
                      >
                        {t("detail.join.cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    <div
                      style={{
                        fontFamily: MARGINALIA,
                        fontStyle: "italic",
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: calligraphic flourish above the codex title.
                        fontSize: 13,
                        color: CAPTION,
                        marginBottom: "var(--space-xs)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.kicker")
                        : t("ephemerists.road.gateKicker")}
                    </div>
                    <div
                      style={{
                        fontFamily: CAPS,
                        fontWeight: 700,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: Cinzel codex display title.
                        fontSize: 21,
                        lineHeight: 1.08,
                        color: INK,
                        marginBottom: "var(--space-md)",
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("ephemerists.road.gateTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: READING, lineHeight: 1.65, color: INK }}>
                      {burned
                        ? t("detail.burned.body", { faction: factionName(faction.slug) })
                        : t("ephemerists.road.gateBody", { faction: factionName(faction.slug) })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⑥ MEMBERS — keeper of the road + the keepers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: BAND,
                  color: BAND_INK,
                  border: `1px solid ${BRASS}`,
                  boxShadow: SHADOW,
                  textAlign: "center",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    opacity: 0.14,
                    backgroundImage: `repeating-linear-gradient(0deg, ${BRASS_LIGHT} 0 1px, transparent 1px 20px), repeating-linear-gradient(90deg, ${BRASS_LIGHT} 0 1px, transparent 1px 20px)`,
                  }}
                />
                <div style={{ position: "relative", zIndex: 2, padding: "var(--space-xl) var(--space-lg) var(--space-lg)" }}>
                  <div
                    style={{
                      ...SMALL_CAPS,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the incised caption over the spotlight's medallion.
                      fontSize: 11,
                      letterSpacing: "0.22em",
                      color: GOLD,
                      marginBottom: "var(--space-md)",
                    }}
                  >
                    {t("ephemerists.spotlight.label")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-md)" }}>
                    <Medallion name={spot.display_name} size={72} />
                  </div>
                  <div
                    style={{
                      fontFamily: DECO,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: the name plate on the spotlight's band.
                      fontSize: 22,
                      lineHeight: 1.1,
                      letterSpacing: "0.04em",
                      color: BAND_INK,
                    }}
                  >
                    {spot.display_name}
                  </div>
                  <div style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", letterSpacing: "0.14em", color: BAND_QUIET, marginTop: "var(--space-sm)" }}>
                    {t("ephemerists.spotlight.stat", {
                      level: romanLevel(spot.level),
                      score: spot.all_time_score.toLocaleString(),
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )}

          <div style={{ ...CARD, padding: "var(--space-lg) var(--space-xl) var(--space-lg)" }}>
            <div style={{ position: "relative", zIndex: 2, ...SMALL_CAPS, fontWeight: 600, fontSize: "var(--text-md)", letterSpacing: "0.2em", color: CAPTION, marginBottom: "var(--space-md)" }}>
              {t("ephemerists.roster.heading")}
            </div>
            {roster.length === 0 ? (
              <p className="content-text" style={{ position: "relative", zIndex: 2, fontFamily: MARGINALIA, fontStyle: "italic", color: QUIET }}>
                {spot
                  ? t("ephemerists.roster.emptyWithSpotlight")
                  : t("detail.membersEmpty")}
              </p>
            ) : (
              roster.map((m) => (
                <Link
                  key={m.id}
                  to={`/characters/${m.id}`}
                  style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0", borderBottom: `1px solid ${RULE}`, textDecoration: "none" }}
                >
                  <Medallion name={m.display_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="content-text" style={{ fontFamily: READING, color: INK, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.display_name}
                    </div>
                  </div>
                  <Tally level={m.level} />
                  <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: NILE }}>
                    {t("ephemerists.roster.level", { level: romanLevel(m.level) })}
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
