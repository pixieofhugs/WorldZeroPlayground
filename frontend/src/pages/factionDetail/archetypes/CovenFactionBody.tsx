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
  SigilMark,
  SlipAvatar,
  SLIP_SHEET,
  SOFT,
  Spark,
} from "../../../components/factionMarks/covenSlip";
import { computeFactionMultiplier } from "../../../utils/points";
import { factionName, factionDescription } from "../../../utils/factions";
import type { CharacterOut } from "../../../api/auth";
import { JoinControl, type JoinControlSkin } from "../JoinControl";
import { SectionPanel, SectionToggle, useFactionSections } from "../sectionDisclosure";
import type { FactionDetailState } from "../useFactionDetail";

/**
 * Cozy Coven faction-body (#1209) — the standardized six-section spine, on the
 * coven's own paper (② About, ③ join, ④ Tasks, ⑤ Praxis, ⑥ Members). Section ①
 * (hero + side counts) is CovenFactionHero, above.
 *
 * Same shape as EverymenFactionBody / UaFactionBody — Tasks/Praxis reuse the
 * app-wide per-faction cards (TaskCard / PraxisCard already dispatch to the Coven
 * atoms) so this file only owns the chrome around them: the two-column layout,
 * the manifesto panel, the join plate, the spotlight and the roster.
 *
 * THIS REPLACES THE CORK MEMO BOARD. The washi-taped index cards with their
 * ruled lines and red margin rule, the pushpinned `join.exe` window with its
 * traffic lights, the Witch-of-the-week polaroid, the die-cut ivy, the kraft
 * sticker headings and the two raw warm-brown rgba shadows this file carried are
 * all the lo-fi metaphor the v2 task card retired (#1023). What replaces them is
 * the vocabulary the slip already ships: the pink→lavender sheet as a band, ward
 * paper as every panel, braided thread as every rule, and the pentagram badge.
 *
 * There is no roster row in the design — task and praxis detail pages carry none
 * — so the member list and the spotlight are built from the two list shapes the
 * design DOES draw: the submission card and the comment row.
 *
 * NO COPY CHANGED when this file replaced the memo board — every string was the
 * `factions` catalog key it was. That is exactly how `join.exe` survived the
 * window it titled: #1948 is the one string since changed (`join.windowTitle` →
 * `join.heading`, "the circle").
 */

const CHROME = "var(--font-faction-rounded)"; // Quicksand

/**
 * Section heading — the display face, then a braid.
 *
 * It used to close on a kicker (`coven.tasks.kicker` / `coven.praxis.kicker`).
 * #1909 cut the slot: the audit found the kicker restated its own heading, and
 * only the seven bespoke bodies had one at all.
 */
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

/** Paper laid on the candlelight — every block on this page sits in one. */
const PANEL: CSSProperties = {
  background: CARD,
  border: `2px solid ${BORDER}`,
  borderRadius: 16,
  boxSizing: "border-box",
  boxShadow: SHADOW,
  padding: "var(--space-xl)",
};

/** The reading voice — the manifesto, the join copy, every empty state. */
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
    viewerFactionSlug,
    gameFactions,
    onSignup,
    membership,
  } = state;
  const sections = useFactionSections();

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
    <div className="wz-faction-grid" style={{ fontFamily: CHROME, color: INK }}>
      {/* ── MAIN COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ② ABOUT — the manifesto, written out */}
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

        {/* ④ TASKS */}
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
                    multiplier={computeFactionMultiplier(
                      viewerFactionSlug,
                      task.primary_faction_slug,
                      gameFactions,
                    )}
                    onSignup={onSignup}
                  />
                ))}
              </div>
            )}
          </SectionPanel>
        </div>

        {/* ⑤ PRAXIS */}
        <div>
          <SectionHead>
            <SectionToggle section={sections.praxis} label={t("detail.default.recentHeading")} />
          </SectionHead>
          <SectionPanel section={sections.praxis}>
            {recentPraxis.length === 0 ? (
              <p className="content-text" style={{ ...PROSE, marginTop: "var(--space-md)" }}>{t("detail.default.recentEmpty")}</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-xl)", alignItems: "flex-start" }}>
                {recentPraxis.map((praxis) => (
                  <div key={praxis.id} style={{ position: "relative", flex: "1 1 var(--praxis-card-basis, 394px)", minWidth: 280 }}>
                    {/* ⑤ Task Crown (ADR-0028) — the skin's own corner medallion,
                        so the card's built-in stamp is suppressed. */}
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
      </div>

      {/* ── RIGHT RAIL ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ③ join — the slip band over a candle-lit panel: standing / join / gate */}
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
              <SigilMark size={26} />
              {/*
                #1948: this bar used to read `join.exe` — the title of the
                pushpinned window #1209 deleted, re-hung on the panel that
                replaced it. Every sibling names its join panel in its own voice
                (`road.heading` "The Road", `roll.heading` "THE ROLL",
                `access.heading` "ACCESS"), so Coven's is `join.heading` too.
              */}
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
                  // The spark rides IN the label rather than in a slot of its
                  // own: the label is a node, and one faction's glyph is not a
                  // reason for every other kit to carry an unused prop (#2651).
                  openLabel={
                    <>
                      <Spark size={12} color={CTA_INK} />
                      {t("coven.join.joinButton")}
                    </>
                  }
                  joiningLabel={t("coven.join.joining")}
                  intro={
                    // The pitch is centred and the question is not — the two
                    // states parted here before the extraction, so the
                    // alignment travels with the pitch rather than wrapping
                    // both.
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

        {/* ⑥ MEMBERS — the spotlight card, then the roster as comment rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
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
      </div>
    </div>
  );
}

/**
 * The trio's paint (#2651) — the slip's gradient CTA for both affirmatives and
 * the caption register for the cancel, which is what these three buttons already
 * wore. The open pill keeps its glow and its centring flex, because it carries a
 * glyph; the confirm never had either. `flex`, the busy opacity and the busy
 * cursor came off all three: the shared control owns the pending state now.
 */
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
