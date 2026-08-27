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
 * slots as `DefaultFieldDesk` — carried life, level track, active quests, primary
 * actions, pending-request line. Only the dress changes; nothing here fetches.
 *
 * THREE DEVIATIONS FROM THE DRAWING, each forced:
 *
 *  • the PHONE BEZEL and the 9:41 CLOCK are the mockup's device shell and are
 *    dropped (see the note in `wowMobile.tsx`). The header's `✦ 4,180` is real
 *    — it is the carried life's score — and it survives, but no longer in the
 *    tally corner: #1553 allows exactly ONE points figure per identity block,
 *    so the spark and the number moved down into the crest's footer beside the
 *    level track, and the corner took the Characters/Edit chits instead.
 *  • the BOTTOM NAV is dropped: the app's `MobileTabBar` is global chrome, and
 *    a per-faction nav would both fork it and strand a knight with three of its
 *    destinations.
 *  • the kit's quest row is a title + a ✦points figure on one line. At 375px
 *    that line collides, so points move to their own footer row beside the level
 *    — geometry yields to type (§4), and it is also what makes the whole row a
 *    46px-tall target rather than a 14px title.
 *
 * ONE FIGURE PER ROW, AND IT IS THE PRAXIS'S SCORE (#1834). The footer row used
 * the shared `fieldDesk.home.taskMeta` line ("faction · +N pts") NEXT TO the
 * kit's gilt ✦ figure, so the same number was printed twice — and both read the
 * TASK's base worth rather than what the quest has actually earned. The gilt
 * figure is the kit's, so it stays and carries the score; the muted line beside
 * it keeps naming the task's faction, which is what makes the row's sigil
 * decorative.
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

/** Every tappable row clears the faction's 46px thumb target. */
const TAP = 46;

/** The task-faction mark on a quest chit (#1711). 15 rather than 14: the frame
 *  is the roomiest of the eight, and WOW's own mark is a struck coin that needs
 *  every pixel it can get before its motto band drops out. */
const ROW_SIGIL = 15;

/**
 * Characters / Edit as real controls (#1553) — a gilt-framed chit on the crest.
 * They were bare caps: a sub-20px hit target on a phone. 44 is the WCAG 2.5.5
 * floor, and this skin's own thumb target is TAP (46), which clears it.
 */
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

/** The baseline row under the track — the chronicle's quiet hand. */
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
        /* The crest's own corner carries the two actions now — no eyebrow, and
           no score up here: there is exactly one points figure and it is the
           one in the footer below (#1553). */
        tally={
          <span style={{ display: "inline-flex", gap: "var(--space-sm)" }}>
            {/* Hidden when the roster has nothing to offer (#2111): one life and a
                shut second-character gate make this two taps to a dead end. */}
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
            {/* This slot held "Good morrow, Sir {{name}}."
                (`fieldDesk.home.wow.greeting`) — the one greeting in the app,
                and the only desk that did not simply print the carried life's
                name here. #1911 collapsed the family; the name is what the
                other seven show, so it is what this shows. */}
            {character.display_name}
          </Link>
        }
        byline={t("sidebar.characterCard.level", { level: character.level })}
        footer={
          <div style={{ marginTop: "var(--space-lg)" }}>
            {/* The one points figure, in the display face. */}
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

            {/* The level track. WOW's spectrum is the gold/plum checker — the
                same device as the running head and the quest frame, at a third
                scale — CLIPPED by the fill width rather than squeezed into it. */}
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
        {/* An italic flourish line ("Thy crusade awaits. The noodle sword is
            where thou left it.", `fieldDesk.home.wow.masthead`) opened this
            column. No other desk carries a subtitle at all — the other seven
            put the page's name in an h1 and get on with it — so #1911's
            collapse of the masthead family has no shared sentence to leave
            here. The frame, the gilt and the spacing are untouched. */}

        {/* ── the herald's dispatches, in all three of their states (#1554) ── */}
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

        {/* ── Thy Open Quests ── */}
        <section>
          <WowSectionHead
            trailing={
              <Link
                to="/tasks"
                className="label-caption"
                /* On the pavilion ground, not on a card — WOW_DEEP reads 3.51:1
                   there and the page's own label ink 4.61:1 (#2248). */
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
              /* The empty line is the one piece of body copy this desk sets on
                 the bare pavilion ground: WOW_MUTED is 3.14:1 there, the page's
                 own quiet ink 4.61:1 (#2248). The quest rows below keep
                 WOW_MUTED — they are on the cream card it was measured for. */
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
                    {/* The quest's own house, marked (#1711). This frame drew no
                        faction mark at all; the sigil leads the title line, and
                        the italic line below still names the faction in words,
                        so the mark is decorative. `flex-start` rather than
                        `center` because a quest title wraps. */}
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

        {/* ── the two verbs ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
          <Link to={FIND_TASK_LINK} className="wow-btn" style={wowGiltButton}>
            <WowSpark color="var(--faction-wow-quest-text)" />
            {t("fieldDesk.home.findTask")}
          </Link>
          <Link to={CAST_VOTES_LINK} style={{ ...wowGhostButton, flex: "1 1 auto" }}>
            {t("fieldDesk.home.castVotes")}
          </Link>
        </div>
      </div>

      {/* The switcher the "Characters" chit opens (#516). */}
      <CharacterSwitcherSheet
        open={switcherOpen}
        activeCharacterId={character.id}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  );
}
