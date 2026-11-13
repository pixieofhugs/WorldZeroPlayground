import { type CSSProperties, type ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import TaskCard from "../../../components/taskCard/TaskCard";
import PraxisCard from "../../../components/praxisCard/PraxisCard";
import { TaskCrown } from "../../../components/factionMarks/TaskCrown";
import {
  Braid,
  CAPTION,
  CARD,
  BORDER,
  CTA_FROM,
  CTA_INK,
  CTA_TO,
  DEEP,
  DISPLAY,
  GLOW,
  GOLD,
  HAND,
  HAIR,
  INK,
  READING,
  SHADOW,
  SlipAvatar,
  SLIP_SHEET,
  SOFT,
  Spark,
} from "../../../components/factionMarks/covenSlip";
import { CovenSigil } from "../../../components/sigil/CovenSigil";
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
 * Cozy Coven faction body (#1209): the shared spine on the coven's own paper,
 * in the slip's vocabulary (#1023): sheet band, ward-paper panels, braid rules.
 * The hero is CovenFactionHero; Tasks/Praxis reuse the app-wide cards.
 */

const CHROME = "var(--font-faction-script)"; // Caveat

/** Section heading: the display face, then a braid. */
function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-lg)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: "var(--text-heading)",
          lineHeight: 1.06,
          letterSpacing: "0.02em",
          color: INK,
        }}
      >
        {children}
      </span>
      <Braid style={{ flex: 1 }} />
    </div>
  );
}

const PANEL: CSSProperties = {
  background: CARD,
  border: `2px solid ${BORDER}`,
  borderRadius: 16,
  boxSizing: "border-box",
  boxShadow: SHADOW,
  padding: "var(--space-xl)",
};

const PROSE: CSSProperties = {
  fontFamily: READING,
  fontStyle: "italic",
  lineHeight: 1.55,
  color: SOFT,
};

export default function CovenFactionBody({ state }: { state: FactionDetailState }) {
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
    <div className="wz-faction-grid" style={{ ...factionBodyVars("coven"), fontFamily: CHROME, color: INK }}>
      <div style={PANEL}>
        <div
          style={{
            fontFamily: HAND,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — the coven's own hand, not typeset copy.
            fontSize: 30,
            fontWeight: 700,
            color: INK,
            lineHeight: 1,
            marginBottom: "var(--space-md)",
          }}
        >
          {t("detail.aboutHeading")}
        </div>
        <Braid style={{ marginBottom: "var(--space-md)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {paragraphs.length ? (
            paragraphs.map((para, i) => (
              <p key={i} className="content-text" style={{ ...PROSE, lineHeight: 1.75, margin: 0 }}>
                {para}
              </p>
            ))
          ) : (
            <p className="content-text" style={{ ...PROSE, lineHeight: 1.75, margin: 0 }}>
              {t("detail.descriptionEmpty")}
            </p>
          )}
        </div>
      </div>

      {/* Standing + champion band (#3182) */}
      <div className="wz-faction-band">
        {membership.state !== "none" && (
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: `2px solid ${BORDER}`,
              boxShadow: SHADOW,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                padding: "var(--space-md) var(--space-lg)",
                background: SLIP_SHEET,
                borderBottom: `2px solid ${BORDER}`,
              }}
            >
              <CovenSigil size={26} color={DEEP} />
              <span style={{ ...CAPTION, marginLeft: "auto" }}>{t("coven.join.heading")}</span>
            </div>

            <div style={{ background: CARD, padding: "var(--space-lg)" }}>
              {membership.state === "member" && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-sm)" }}>
                    <Spark size={30} color={GOLD} />
                  </div>
                  <div
                    style={{
                      fontFamily: HAND,
                      // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — the coven's own hand, not typeset copy.
                      fontSize: 25,
                      fontWeight: 700,
                      color: INK,
                      lineHeight: 1,
                    }}
                  >
                    {t("coven.join.memberTitle")}
                  </div>
                  <div style={{ ...PROSE, fontSize: "var(--text-content)", marginTop: "var(--space-sm)" }}>
                    <Trans t={t} i18nKey="coven.join.memberStanding">
                      Standing · <b style={{ color: DEEP }}>coven witch</b>
                    </Trans>
                  </div>
                </div>
              )}

              {membership.state === "eligible" && (
                <JoinControl
                  membership={membership}
                  name={factionName(faction.slug)}
                  skin={JOIN_SKIN}
                  // The spark rides in the label node, not a prop every kit would carry (#2651).
                  openLabel={
                    <>
                      <Spark size={12} color={CTA_INK} />
                      {t("coven.join.joinButton")}
                    </>
                  }
                  joiningLabel={t("coven.join.joining")}
                  intro={
                    // Only the pitch is centred, not the confirm question.
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontFamily: HAND,
                          // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — the coven's own hand, not typeset copy.
                          fontSize: 26,
                          fontWeight: 700,
                          color: INK,
                          lineHeight: 1,
                          marginBottom: "var(--space-sm)",
                        }}
                      >
                        {t("coven.join.eligibleTitle")}
                      </div>
                      <div className="content-text" style={{ ...PROSE, marginBottom: "var(--space-lg)" }}>
                        {t("coven.join.eligibleBody")}
                      </div>
                    </div>
                  }
                />
              )}

              {(membership.state === "gate" || burned) && (
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-sm)", marginBottom: "var(--space-md)" }}>
                    {/* eslint-disable-next-line local/no-raw-style-values -- ornament: optical nudge aligning the sparkle glyph to the script cap-height. */}
                    <span style={{ marginTop: 3 }}>
                      <Spark size={20} color={GOLD} />
                    </span>
                    <span
                      style={{
                        fontFamily: HAND,
                        // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — the coven's own hand, not typeset copy.
                        fontSize: 23,
                        fontWeight: 700,
                        color: INK,
                        lineHeight: 1.2,
                      }}
                    >
                      {burned
                        ? t("detail.burned.title", { faction: factionName(faction.slug) })
                        : t("coven.join.gateTitle")}
                    </span>
                  </div>
                  <div className="content-text" style={PROSE}>
                    {burned
                      ? t("detail.burned.body", { faction: factionName(faction.slug) })
                      : t("mobile.gateHint", { faction: factionName(faction.slug) })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          {spot && (
            <Link to={`/characters/${spot.id}`} style={{ textDecoration: "none" }}>
              <div style={{ ...PANEL, padding: "var(--space-lg)", textAlign: "center" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    background: SLIP_SHEET,
                    border: `1.5px solid ${BORDER}`,
                    padding: "var(--space-lg)",
                    marginBottom: "var(--space-md)",
                  }}
                >
                  <SlipAvatar name={spot.display_name} size={60} avatarUrl={spot.avatar_url} />
                </div>
                <div style={CAPTION}>{t("coven.spotlight.label")}</div>
                <div
                  style={{
                    fontFamily: HAND,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat roster name.
                    fontSize: 26,
                    fontWeight: 700,
                    color: INK,
                    lineHeight: 1,
                    marginTop: "var(--space-xs)",
                  }}
                >
                  {spot.display_name}
                </div>
                <div style={{ ...PROSE, fontSize: "var(--text-content)", marginTop: "var(--space-xs)" }}>
                  {t("detail.spotlightStat", {
                    level: spot.level,
                    score: spot.all_time_score.toLocaleString(),
                    count: spot.all_time_score,
                  })}
                </div>
              </div>
            </Link>
          )}
      </div>

      <div>
        <SectionHead>
          <SectionToggle
            section={sections.tasks}
            label={t("detail.default.tasksHeading", { total: tasks.length })}
          />
        </SectionHead>
        <SectionPanel section={sections.tasks}>
          {tasks.length === 0 ? (
            <p className="content-text" style={{ ...PROSE, marginTop: "var(--space-md)" }}>{t("detail.default.tasksEmpty")}</p>
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
        <SectionHead>
          <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
        </SectionHead>
        <SectionPanel section={sections.praxis}>
          {recentPraxis.length === 0 ? (
            <p className="content-text" style={{ ...PROSE, marginTop: "var(--space-md)" }}>{t("detail.default.recentEmpty")}</p>
          ) : (
            <div className="wz-faction-praxis-row" style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start" }}>
              {recentPraxis.map((praxis) => (
                <div key={praxis.id} style={{ position: "relative", flex: "0 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                  {/* Task Crown (ADR-0028) replaces the card's built-in stamp. */}
                  {praxis.is_top_for_task && (
                    <TaskCrown
                      size={44}
                      rotate="-8deg"
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
        <div style={{ ...PANEL, padding: "var(--space-lg)" }}>
          <div
            style={{
              fontFamily: HAND,
              // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat — the coven's own hand, not typeset copy.
              fontSize: 23,
              fontWeight: 700,
              color: INK,
              lineHeight: 1,
              marginBottom: "var(--space-sm)",
            }}
          >
            {t("detail.default.membersHeading", { total: members.length })}
          </div>
          <Braid style={{ marginBottom: "var(--space-sm)" }} />
          {roster.length === 0 ? (
            <p className="content-text" style={{ ...PROSE, margin: 0 }}>
              {spot
                ? t("detail.membersEmptyWithSpotlight")
                : t("detail.membersEmpty")}
            </p>
          ) : (
            roster.map((member, index) => (
              <Link
                key={member.id}
                to={`/characters/${member.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  padding: "var(--space-sm) 0",
                  borderTop: index === 0 ? undefined : `1px solid ${HAIR}`,
                  textDecoration: "none",
                }}
              >
                <SlipAvatar name={member.display_name} size={26} avatarUrl={member.avatar_url} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: HAND,
                    // eslint-disable-next-line local/no-raw-style-values -- ornament: hand-lettered Caveat roster name.
                    fontSize: 19,
                    color: INK,
                    lineHeight: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {member.display_name}
                </span>
                <span style={CAPTION}>{t("detail.memberLevel", { level: member.level })}</span>
              </Link>
            ))
          )}
        </div>
    </div>
  );
}

/** The join trio's paint (#2651); the shared control owns the pending state. */
const JOIN_SKIN: JoinControlSkin = {
  openStyle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-sm)",
    width: "100%",
    fontFamily: CHROME,
    fontSize: "var(--text-lg)",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: CTA_INK,
    background: `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`,
    border: `1.5px solid ${CTA_TO}`,
    borderRadius: 12,
    padding: "var(--space-md)",
    boxShadow: `0 8px 18px -8px ${GLOW}`,
    cursor: "pointer",
  },
  confirmStyle: {
    fontFamily: CHROME,
    fontSize: "var(--text-md)",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: CTA_INK,
    background: `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`,
    border: `1.5px solid ${CTA_TO}`,
    borderRadius: 12,
    padding: "var(--space-md)",
  },
  cancelStyle: {
    ...CAPTION,
    background: "transparent",
    border: `1.5px solid ${BORDER}`,
    borderRadius: 12,
    padding: "var(--space-md) var(--space-lg)",
  },
  proseStyle: {
    fontFamily: READING,
    lineHeight: 1.6,
    color: INK,
    marginBottom: "var(--space-lg)",
  },
  errorStyle: { fontFamily: READING, color: "var(--color-danger)", marginBottom: "var(--space-sm)" },
};
