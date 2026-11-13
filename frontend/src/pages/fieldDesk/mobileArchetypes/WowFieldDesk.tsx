/**
 * WOW MOBILE FieldDesk: the field pavilion (kit `10-mobile-skins.html`, #901),
 * built from the drawing. Vocabulary lives in `factionMarks/wowMobile.tsx`.
 * Same slots as `DefaultFieldDesk`; nothing here fetches.
 *
 * Forced deviations from the drawing: no bezel/clock or bottom nav (global
 * `MobileTabBar`); the score moves to the crest footer (one points figure per
 * identity block, #1553); quest points get their own row (collides at 375px).
 * Each row shows the PRAXIS's score once, beside the task's faction (#1834).
 */
import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WOW_PAGE_LABEL,
  WOW_PAGE_MUTED,
  WOW_PLATE,
  WOW_PLUM,
  WOW_RULE,
  WowPavilionHeader,
  WowQuestFrame,
  WowSectionHead,
  WowSpark,
  wowChecker,
  wowGhostButton,
  wowGiltButton,
  wowMobilePage,
} from "../../../components/factionMarks/wowMobile";
import CharacterSwitcherSheet from "../../../components/CharacterSwitcherSheet";
import FactionSigil from "../../../components/sigil/FactionSigil";
import { factionName } from "../../../utils/factions";
import { formatPoints } from "../../../utils/points";
import type { FieldDeskHomeState } from "../useFieldDeskHome";
import PendingRowPill from '../PendingRowPill'
import { CAST_VOTES_LINK, FIND_TASK_LINK } from '../homeDestinations'
import LevelTrackMeta from "../../../components/LevelTrackMeta";
import { factionBodyVars } from '../../../utils/factionBodyFace'

/** Every tappable row clears the faction's 46px thumb target. */
const TAP = 46;

/** Row task-faction mark (#1711); 15 so the coin keeps its motto band. */
const ROW_SIGIL = 15;

/** Characters / Edit pills (#1553); TAP (46) clears the WCAG 2.5.5 44 floor. */
const actionPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: TAP,
  boxSizing: "border-box",
  padding: "0 var(--space-lg)",
  borderRadius: 999,
  border: `1.5px solid ${WOW_RULE}`,
  background: WOW_PLATE,
  fontFamily: WOW_DISPLAY,
  fontSize: "var(--text-lg)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: WOW_PLUM,
  textDecoration: "none",
  cursor: "pointer",
  transition: "opacity 120ms ease",
};

const trackMetaStyle: CSSProperties = {
  fontFamily: WOW_BODY,
  fontSize: "var(--text-md)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: WOW_DEEP,
};

export default function WowFieldDesk({ state }: { state: FieldDeskHomeState }) {
  const { t } = useTranslation("common");
  const { character, eraName, levelTrack, activeTasks, pendingRow, offersACharacterChoice } =
    state;
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <div
      data-skin="wow"
      style={{ ...factionBodyVars("wow"),
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
        /* No score up here: one points figure, in the footer (#1553). */
        tally={
          <span style={{ display: "inline-flex", gap: "var(--space-sm)" }}>
            {/* Hidden when there is no other life to switch to (#2111). */}
            {offersACharacterChoice && (
              <button
                type="button"
                onClick={() => setSwitcherOpen(true)}
                style={actionPillStyle}
                className="hover:opacity-80 active:opacity-60"
              >
                {t("sidebar.characterCard.characters")}
              </button>
            )}
            <Link
              to={`/characters/${character.id}/edit`}
              style={actionPillStyle}
              className="hover:opacity-80 active:opacity-60"
            >
              {t("sidebar.characterCard.edit")}
            </Link>
          </span>
        }
        name={
          <Link
            to={`/characters/${character.id}`}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {character.display_name}
          </Link>
        }
        byline={t("sidebar.characterCard.level", { level: character.level })}
        footer={
          <div style={{ marginTop: "var(--space-lg)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                gap: "var(--space-sm)",
              }}
            >
              <span
                style={{
                  fontFamily: WOW_DISPLAY,
                  fontSize: "var(--text-heading)",
                  lineHeight: 1,
                  color: WOW_FIGURE,
                }}
              >
                <WowSpark /> {character.score.toLocaleString()}
              </span>
              <span style={trackMetaStyle}>
                {eraName
                  ? t("sidebar.characterCard.eraPoints", { era: eraName, count: character.score })
                  : t("sidebar.characterCard.points", { count: character.score })}
              </span>
            </div>

            {/* Level track: the gold/plum checker, clipped by fill width. */}
            <div
              style={{
                height: 6,
                borderRadius: 999,
                overflow: "hidden",
                background: WOW_PLATE,
                border: `1px solid ${WOW_RULE}`,
                marginTop: "var(--space-md)",
              }}
              {...(levelTrack
                ? {
                    role: "progressbar",
                    "aria-valuemin": 0,
                    "aria-valuemax": 100,
                    "aria-valuenow": Math.round(levelTrack.fillPercent),
                    "aria-label": t("sidebar.characterCard.trackLabel", {
                      score: levelTrack.pointsIntoLevel.toLocaleString(),
                      target: levelTrack.levelSpan.toLocaleString(),
                      level: levelTrack.nextLevel ?? character.level,
                    }),
                  }
                : null)}
            >
              <div
                style={{
                  height: "100%",
                  width: `${levelTrack?.fillPercent ?? 0}%`,
                  borderRadius: 999,
                  background: wowChecker(6),
                  transition: "width 300ms",
                }}
              />
            </div>

            <LevelTrackMeta
              track={levelTrack}
              allTimeScore={character.all_time_score}
              style={trackMetaStyle}
            />
          </div>
        }
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
        {pendingRow && (
          <PendingRowPill
            row={pendingRow}
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
            glyph={<WowSpark />}
            chevron={
              <span aria-hidden style={{ color: WOW_DEEP }}>
                ›
              </span>
            }
          />
        )}

        <section>
          <WowSectionHead
            trailing={
              <Link
                to="/tasks"
                className="label-caption"
                /* Pavilion ground, not a card: WOW_DEEP fails AA here (#2248). */
                style={{ color: WOW_PAGE_LABEL, textDecoration: "none", whiteSpace: "nowrap" }}
              >
                {t("fieldDesk.home.viewAll")}
              </Link>
            }
          >
            {t("fieldDesk.home.questsHeading")}
          </WowSectionHead>

          {activeTasks.length === 0 ? (
            <p
              className="content-text"
              /* Bare pavilion ground: WOW_MUTED fails AA here; rows keep it (#2248). */
              style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_PAGE_MUTED, margin: 0 }}
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
                    {/* Task's faction mark (#1711), decorative; flex-start as titles wrap. */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "var(--space-sm)",
                      }}
                    >
                      <span aria-hidden style={{ display: "flex", flex: "none" }}>
                        <FactionSigil slug={praxis.task_faction_slug} size={ROW_SIGIL} />
                      </span>
                      <div
                        style={{
                          fontFamily: WOW_DISPLAY,
                          fontSize: "var(--text-content)",
                          lineHeight: 1.15,
                          color: WOW_INK,
                          overflowWrap: "anywhere",
                          minWidth: 0,
                        }}
                      >
                        {praxis.task_title}
                      </div>
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
                        {factionName(praxis.task_faction_slug)}
                      </span>
                      <span
                        style={{
                          fontFamily: WOW_DISPLAY,
                          fontSize: "var(--text-content)",
                          color: WOW_FIGURE,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✦{formatPoints(praxis.score)}
                      </span>
                    </div>
                  </Link>
                </WowQuestFrame>
              ))}
            </div>
          )}
        </section>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
          <Link to={FIND_TASK_LINK} className="wow-btn" style={wowGiltButton}>
            <WowSpark color="var(--faction-wow-quest-text)" />
            {t("fieldDesk.home.findTask")}
          </Link>
          {/* Absent, not disabled, below the era's vote level (#3133). */}
          {state.canVote && (
            <Link to={CAST_VOTES_LINK} style={{ ...wowGhostButton, flex: "1 1 auto" }}>
              {t("fieldDesk.home.castVotes")}
            </Link>
          )}
        </div>
      </div>

      <CharacterSwitcherSheet
        open={switcherOpen}
        activeCharacterId={character.id}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  );
}
