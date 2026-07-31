/**
 * WOW MOBILE FieldDesk — THE FIELD PAVILION (kit `10-mobile-skins.html`, #901).
 *
 * This is the ONE screen the kit actually drew, so it is built from the drawing
 * rather than derived: the crested header wash under a gold rule, "Thy Open
 * Quests" over a stack of gold-framed cream quest cards each headed by the 6px
 * gold/plum checker, and the gilt call to action.
 *
 * The pavilion vocabulary lives in `components/factionMarks/wowMobile.tsx` — the five
 * later WOW mobile surfaces compose the same pieces, so the faction reads as one
 * faction across the phone (§6).
 *
 * SLOTS ARE INVARIANT. Same {@link FieldDeskHomeState} and the same content
 * slots as `DefaultFieldDesk` — carried life, stat tiles, active quests, primary
 * actions, pending-request line. Only the dress changes; nothing here fetches.
 *
 * THREE DEVIATIONS FROM THE DRAWING, each forced:
 *
 *  • the PHONE BEZEL and the 9:41 CLOCK are the mockup's device shell and are
 *    dropped (see the note in `wowMobile.tsx`). The header's `✦ 4,180` is real
 *    — it is the carried life's score — and survives as the header tally.
 *  • the BOTTOM NAV is dropped: the app's `MobileTabBar` is global chrome, and
 *    a per-faction nav would both fork it and strand a knight with three of its
 *    destinations.
 *  • the kit's quest row is a title + a ✦points figure on one line. At 375px
 *    that line collides, so points move to their own footer row beside the level
 *    — geometry yields to type (§4), and it is also what makes the whole row a
 *    46px-tall target rather than a 14px title.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WOW_PLATE,
  WOW_PLUM,
  WOW_RULE,
  WowPavilionHeader,
  WowQuestFrame,
  WowSectionHead,
  WowSpark,
  wowGhostButton,
  wowGiltButton,
  wowMobilePage,
} from "../../../components/factionMarks/wowMobile";
import { factionName } from "../../../utils/factions";
import type { FieldDeskHomeState } from "../useFieldDeskHome";
import { REQUESTS_QUEUE_LINK } from '../../updates/requestsQueueAnchor'

/** Every tappable row clears the faction's 46px thumb target. */
const TAP = 46;

export default function WowFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation("common");
  const { character, eraName, votesReceived, activeTasks, pendingCount, canProposeTask } = state;

  const stats = [
    { label: t("fieldDesk.home.stats.points"), value: character.score?.toLocaleString() ?? "0" },
    { label: t("fieldDesk.home.stats.votes"), value: votesReceived.toLocaleString() },
    { label: t("fieldDesk.home.stats.era"), value: eraName || "—" },
  ];

  return (
    <div
      data-skin="wow"
      style={{
        ...wowMobilePage,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-lg)",
        // full-bleed: cancel the mobile shell's gutter so the pavilion header
        // reaches both edges the way the kit draws it, then re-inset the body.
        marginLeft: "calc(-1 * var(--space-lg))",
        marginRight: "calc(-1 * var(--space-lg))",
        paddingBottom: "var(--space-xl)",
      }}
    >
      <WowPavilionHeader
        eyebrow={
          <>
            {t("fieldDesk.home.wow.charEyebrow")}
            <Link
              to={`/characters/${character.id}/edit`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: TAP,
                marginLeft: "var(--space-sm)",
                color: WOW_PLUM,
                textDecoration: "none",
              }}
            >
              {t("fieldDesk.home.edit")}
            </Link>
          </>
        }
        tally={
          <>
            <WowSpark /> {character.score?.toLocaleString() ?? "0"}
          </>
        }
        name={
          <Link
            to={`/characters/${character.id}`}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {t("fieldDesk.home.wow.greeting", { name: character.display_name })}
          </Link>
        }
        byline={t("sidebar.characterCard.factionLevel", {
          faction: factionName(character.faction_slug),
          level: character.level,
        })}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-lg)",
          paddingLeft: "var(--space-lg)",
          paddingRight: "var(--space-lg)",
        }}
      >
        <p
          className="content-text"
          style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_MUTED, margin: 0 }}
        >
          {t("fieldDesk.home.wow.masthead")}
        </p>

        {/* ── the tally of deeds ── */}
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                textAlign: "center",
                background: WOW_PLATE,
                border: `1px solid ${WOW_RULE}`,
                borderRadius: 7,
                padding: "var(--space-md) var(--space-sm)",
              }}
            >
              <div
                className="content-title"
                style={{
                  fontFamily: WOW_DISPLAY,
                  lineHeight: 1,
                  color: WOW_FIGURE,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stat.value}
              </div>
              <div className="eyebrow" style={{ color: WOW_MUTED, marginTop: "var(--space-xs)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── the herald's pending dispatches ── */}
        {pendingCount > 0 && (
          <Link
            to={REQUESTS_QUEUE_LINK}
            style={{
              minHeight: TAP,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-sm)",
              background: WOW_PLATE,
              border: `1.5px solid ${WOW_RULE}`,
              borderRadius: 7,
              padding: "var(--space-sm) var(--space-lg)",
              fontFamily: WOW_BODY,
              fontSize: "var(--text-content)",
              color: WOW_INK,
              textDecoration: "none",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-sm)" }}>
              <WowSpark />
              {t("fieldDesk.home.pending", { count: pendingCount })}
            </span>
            <span aria-hidden style={{ color: WOW_DEEP }}>
              ›
            </span>
          </Link>
        )}

        {/* ── Thy Open Quests ── */}
        <section>
          <WowSectionHead
            trailing={
              <Link
                to="/tasks"
                className="eyebrow"
                style={{ color: WOW_DEEP, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                {t("fieldDesk.home.viewAll")}
              </Link>
            }
          >
            {t("fieldDesk.home.wow.questsHeading")}
          </WowSectionHead>

          {activeTasks.length === 0 ? (
            <p
              className="content-text"
              style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_MUTED, margin: 0 }}
            >
              {t("fieldDesk.home.questsEmpty")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {activeTasks.map((praxis) => (
                <WowQuestFrame key={praxis.id}>
                  <Link
                    to={`/praxis/${praxis.id}/edit`}
                    style={{
                      display: "block",
                      minHeight: TAP,
                      padding: "var(--space-md)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: WOW_DISPLAY,
                        fontSize: "var(--text-content)",
                        lineHeight: 1.15,
                        color: WOW_INK,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {praxis.task_title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: "var(--space-sm)",
                        marginTop: "var(--space-xs)",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: WOW_BODY,
                          fontStyle: "italic",
                          fontSize: "var(--text-content)",
                          color: WOW_MUTED,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t("fieldDesk.home.taskMeta", {
                          faction: factionName(praxis.task_faction_slug),
                          points: praxis.task_point_value,
                        })}
                      </span>
                      <span
                        style={{
                          fontFamily: WOW_DISPLAY,
                          fontSize: "var(--text-content)",
                          color: WOW_FIGURE,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✦{praxis.task_point_value}
                      </span>
                    </div>
                  </Link>
                </WowQuestFrame>
              ))}
            </div>
          )}
        </section>

        {/* ── the two verbs ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
          <Link to="/tasks" className="wow-btn" style={wowGiltButton}>
            <WowSpark color="var(--faction-wow-quest-text)" />
            {t("fieldDesk.home.browseTasks")}
          </Link>
          {canProposeTask && (
            <Link to="/propose-task" style={{ ...wowGhostButton, flex: "1 1 auto" }}>
              {t("actions.proposeTask")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
