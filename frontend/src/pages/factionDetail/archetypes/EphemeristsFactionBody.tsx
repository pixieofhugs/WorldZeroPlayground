import { type CSSProperties, type ReactNode } from "react";
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
  DECO,
  GOLD,
  INK,
  LINE,
  MARGINALIA,
  QUIET,
  READING,
  RULE,
  SHADOW,
  SMALL_CAPS,
  Tally,
  PLATE as SHEET,
} from "../../../components/factionMarks/ephemeristsPlate";
import { factionName, factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import { JoinControl, type JoinControlSkin } from "../../../components/JoinControl";
import {
  FACTION_SECTIONS,
  SectionPanel,
  SectionToggle,
  useSectionDisclosures,
} from "../sectionDisclosure";
import type { FactionDetailState } from "../useFactionDetail";
import { factionBodyVars } from "../../../utils/factionBodyFace"

/**
 * Ephemerists faction body, the Valley-card skin of the shared spine; marks are
 * the plate kit's (#1208). Two faction grounds carry ink: the night plate
 * (`CARD`) and the spotlight band. The root is a bare `.wz-faction-grid`, so
 * anything outside a `CARD` sits on `--color-bg-page` (near-white in light) and
 * must use the app's own ink tiers, never plate inks (#1675, #1793).
 */

/**
 * The page's quiet ink, not `-plate-quiet` (#1793): no single value of `QUIET`
 * can clear both the night plate and the light page. Gated in `factionContrast.test.ts`.
 */
const PAGE_QUIET = "var(--color-text-secondary)";

const CARD: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  background: SHEET,
  border: `1px solid ${LINE}`,
  boxShadow: SHADOW,
};

const SECTION_HEADING: CSSProperties = {
  fontFamily: DECO,
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the plate's display cut, a step above the content ramp.
  fontSize: 30,
  letterSpacing: "0.04em",
  margin: 0,
  // The page's ink, not the plate's: headings sit outside a card (#1675;
  // `INK` here was 1.13:1 in light).
  color: "var(--color-text-primary)",
};

/** Section title in bare display type; no ornament row (#2210). */
function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 style={SECTION_HEADING}>{children}</h2>;
}

/**
 * A keeper's portrait (`AuthorOctagon`). Takes the whole character so no mount
 * can forget `avatar_url` again (#2228).
 */
function Medallion({ character, size }: { character: CharacterOut; size: number }) {
  return (
    <AuthorOctagon
      name={character.display_name}
      avatarUrl={character.avatar_url}
      size={size}
      fontSize={size * 0.4}
    />
  );
}

export default function EphemeristsFactionBody({ state }: { state: FactionDetailState }) {
  const { t } = useTranslation("factions");
  const {
    faction,
    members,
    tasks,
    recentPraxis,
    onSignup,
    membership,
  } = state;
  const sections = useSectionDisclosures(FACTION_SECTIONS);

  if (!faction) return null;

  // The burn (#1305) reuses the gate's chassis with neutral platform copy (ADR-0061).
  const burned = membership.state === "burned";

  const paragraphs = factionDescription(faction.slug).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const ranked = [...members].sort((a, b) => b.all_time_score - a.all_time_score);
  const spot: CharacterOut | undefined = ranked[0];
  const roster = ranked.slice(1);

  return (
    <div className="wz-faction-grid" style={{ ...factionBodyVars("ephemerists") }}>
      <div style={{ ...CARD, padding: "var(--space-xl) var(--space-2xl)" }}>
        <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
          <EphemeristsSigil size={15} color={BRASS} />
          <span style={{ ...SMALL_CAPS, fontWeight: 600, fontSize: "var(--text-md)", letterSpacing: "0.22em", color: CAPTION }}>
            {t("detail.aboutHeading")}
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
              {t("detail.descriptionEmpty")}
            </p>
          )}
        </div>
      </div>

      {/* Standing + champion band (#3182) */}
      <div className="wz-faction-band">
        {membership.state !== "none" && (
          <div style={{ ...CARD, padding: 0 }}>
            <div style={{ background: BAND, color: BAND_INK, padding: "var(--space-sm) var(--space-lg)", fontFamily: CAPS, fontWeight: 600, fontSize: "var(--text-lg)", letterSpacing: "0.2em", textTransform: "uppercase", boxShadow: `inset 0 -2px 0 ${BRASS}` }}>
              {t("ephemerists.join.heading")}
            </div>
            {/* #2621: every join panel opens at 16px. */}
            <div style={{ position: "relative", padding: "var(--space-lg) var(--space-xl)" }}>
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
                      {t("ephemerists.join.memberTitle")}
                    </div>
                    <div style={{ fontFamily: READING, fontSize: "var(--text-xl)", color: QUIET, margin: "var(--space-md) 0 0" }}>
                      <Trans t={t} i18nKey="ephemerists.join.memberStanding">
                        Standing · <span style={{ color: BRASS_LIGHT }}>keeper of the road</span>
                      </Trans>
                    </div>
                  </div>
                )}

                {membership.state === "eligible" && (
                  <JoinControl
                    membership={membership}
                    name={factionName(faction.slug)}
                    skin={JOIN_SKIN}
                    openLabel={t("ephemerists.join.joinButton")}
                    joiningLabel={t("ephemerists.join.joining")}
                    intro={
                      <>
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
                          {t("ephemerists.join.eligibleTitle")}
                        </div>
                        <div className="content-text" style={{ fontFamily: READING, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" }}>
                          {t("ephemerists.join.eligibleBody")}
                        </div>
                      </>
                    }
                  />
                )}

                {(membership.state === "gate" || burned) && (
                  <div>
                    {burned && (
                      <div
                        style={{
                          fontFamily: MARGINALIA,
                          // eslint-disable-next-line local/no-raw-style-values -- ornament: calligraphic flourish above the codex title.
                          fontSize: 13,
                          color: CAPTION,
                          marginBottom: "var(--space-xs)",
                        }}
                      >
                        {t("detail.burned.kicker")}
                      </div>
                    )}
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
                        : t("ephemerists.join.gateTitle")}
                    </div>
                    <div className="content-text" style={{ fontFamily: READING, lineHeight: 1.65, color: INK }}>
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
                    <Medallion character={spot} size={72} />
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
                    {t("detail.spotlightStat", {
                      level: spot.level,
                      score: spot.all_time_score.toLocaleString(),
                      count: spot.all_time_score,
                    })}
                  </div>
                </div>
              </div>
            </Link>
          )}
      </div>

      <div>
        <SectionHeading>
          <SectionToggle
            section={sections.tasks}
            label={t("detail.default.tasksHeading", { total: tasks.length })}
          />
        </SectionHeading>
        <SectionPanel section={sections.tasks}>
          {tasks.length === 0 ? (
            <p className="content-text" style={{ fontFamily: MARGINALIA, color: PAGE_QUIET }}>
              {t("detail.default.tasksEmpty")}
            </p>
          ) : (
            <div className="task-card-row" style={{ gap: "var(--space-xl)" }}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  basePoints={task.point_value}
                  multiplier={task.viewer_faction_multiplier}
                  onSignup={onSignup}
                />
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      <div>
        <SectionHeading>
          <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
        </SectionHeading>
        <SectionPanel section={sections.praxis}>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ fontFamily: MARGINALIA, color: PAGE_QUIET }}>
              {t("detail.default.recentEmpty")}
            </p>
          ) : (
            <div className="wz-faction-praxis-row" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "0 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                  {/* Task Crown (ADR-0028) replaces the card's built-in stamp. */}
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
        </SectionPanel>
      </div>

      {/* Members last: the roll is uncapped (#3182) */}
        <div style={{ ...CARD, padding: "var(--space-lg) var(--space-xl) var(--space-lg)" }}>
          <div style={{ position: "relative", zIndex: 2, ...SMALL_CAPS, fontWeight: 600, fontSize: "var(--text-md)", letterSpacing: "0.2em", color: CAPTION, marginBottom: "var(--space-md)" }}>
            {t("detail.default.membersHeading", { total: members.length })}
          </div>
          {roster.length === 0 ? (
            <p className="content-text" style={{ position: "relative", zIndex: 2, fontFamily: MARGINALIA, color: QUIET }}>
              {spot
                ? t("detail.membersEmptyWithSpotlight")
                : t("detail.membersEmpty")}
            </p>
          ) : (
            roster.map((m) => (
              <Link
                key={m.id}
                to={`/characters/${m.id}`}
                style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "var(--space-md)", padding: "var(--space-sm) 0", borderBottom: `1px solid ${RULE}`, textDecoration: "none" }}
              >
                <Medallion character={m} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="content-text" style={{ fontFamily: READING, color: INK, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.display_name}
                  </div>
                </div>
                <Tally level={m.level} />
                <span style={{ ...SMALL_CAPS, fontSize: "var(--text-md)", color: BRASS_LIGHT }}>
                  {t("detail.memberLevel", { level: m.level })}
                </span>
              </Link>
            ))
          )}
        </div>
    </div>
  );
}

/**
 * The join trio's paint (#2651). Affirmatives get `.eph-cta` (#2146): its border
 * width differs per cascade, which inline style can't express.
 */
const JOIN_SKIN: JoinControlSkin = {
  className: "eph-cta",
  openStyle: { width: "100%", ...SMALL_CAPS, fontSize: "var(--text-xl)", letterSpacing: "0.14em", padding: "var(--space-md)", cursor: "pointer" },
  confirmStyle: { ...SMALL_CAPS, fontSize: "var(--text-lg)", letterSpacing: "0.12em", padding: "var(--space-md)" },
  cancelStyle: { fontFamily: MARGINALIA, fontSize: "var(--text-lg)", letterSpacing: "0.06em", color: QUIET, background: "transparent", border: `1px solid ${LINE}`, padding: "var(--space-md) var(--space-lg)" },
  proseStyle: { fontFamily: READING, lineHeight: 1.6, color: INK, marginBottom: "var(--space-lg)" },
  errorStyle: { fontFamily: READING, color: "var(--color-danger)", marginBottom: "var(--space-sm)" },
};
