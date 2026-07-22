/**
 * WOW MOBILE task detail — THE DECREE, READ ALOUD (#901).
 *
 * DERIVED, not drawn. The kit's one mobile screen
 * (`10-mobile-skins.html`) covers the field desk and the quest row and nothing
 * else, so this surface is composed from two things that DO exist:
 *
 *   • the pavilion chrome from that screen — the checker running head, the
 *     gold-framed cream panel, the burnt-gold ✦ figure, the two fonts — via
 *     `components/cards/wowMobile.tsx`;
 *   • the desktop archetype's ANATOMY. WOW registers no desktop `taskDetail`,
 *     so the archetype mirrored here is `components/cards/WowTaskCard` (#899):
 *     the decree's checker band, wax seal, points-with-unit block, illuminated
 *     rule and gilt "Take Up the Quest" button, opened out to page width.
 *
 * Slots are `DefaultTaskDetail`'s, unchanged: breadcrumb, hero, brief, glory
 * aggregate, sealed chronicles with the sort toggle, and the shared
 * {@link MobileStickyBar} carrying the one primary verb. Presentation only —
 * every value and handler arrives on {@link TaskDetailState}.
 *
 * DEVIATIONS
 *  • the decree's KNOBBED ROD is dropped. It is 30px of ornament above a
 *    full-bleed page header, where it reads as a stray bar rather than a hung
 *    scroll, and it would push the title below the fold on a 375px screen.
 *  • the WAX SEAL moves into the pavilion header's field disc rather than
 *    floating beside the title — the crest is spent once per screen (§6).
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import i18n from "../../../i18n";
import PraxisCard from "../../../components/PraxisCard";
import {
  WOW_BODY,
  WOW_DEEP,
  WOW_DISPLAY,
  WOW_FIGURE,
  WOW_INK,
  WOW_MUTED,
  WOW_PLATE,
  WOW_RULE,
  WowCheckerBand,
  WowPavilionHeader,
  WowQuestFrame,
  WowSectionHead,
  WowSpark,
  wowGhostButton,
  wowGiltButton,
  wowMobilePage,
} from "../../../components/cards/wowMobile";
import { MobileStickyBar, MobileStickyCaption } from "./shared";
import { LevelJumpBanner } from "../archetypes/shared";
import type { TaskDetailState } from "../useTaskDetail";

export default function WowTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const {
    task,
    submissions,
    mySubmission,
    isInProgress,
    inProgressPraxisId,
    canSignUp,
    slotsOpen,
    maxTaskSlots,
    modifiedPoints,
    topScore,
    voteCount,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state;

  if (!task) return null;

  return (
    <div
      data-skin="wow"
      style={{
        ...wowMobilePage,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-xl)",
        marginLeft: "calc(-1 * var(--space-lg))",
        marginRight: "calc(-1 * var(--space-lg))",
        paddingBottom: "var(--space-xl)",
      }}
    >
      <WowPavilionHeader
        eyebrow={i18n.t("feed:taskCard.wow.decree")}
        tally={
          <>
            <WowSpark />
            {modifiedPoints}
          </>
        }
        name={task.title}
        byline={
          task.status === "active" ? t("wow.statusOpen") : task.status
        }
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-xl)",
          paddingLeft: "var(--space-lg)",
          paddingRight: "var(--space-lg)",
        }}
      >
        <nav className="eyebrow" style={{ color: WOW_DEEP }}>
          <Link to="/tasks" style={{ color: WOW_DEEP, textDecoration: "none" }}>
            {t("wow.breadcrumb")}
          </Link>
          <span aria-hidden> › </span>
          <span style={{ color: WOW_MUTED }}>{t("wow.level", { level: task.level_required })}</span>
        </nav>

        {/* ── what the Court asks ── */}
        <section>
          <WowSectionHead>{t("wow.askingHeading")}</WowSectionHead>
          <WowQuestFrame>
            <p
              className="content-text"
              style={{
                fontFamily: WOW_BODY,
                lineHeight: 1.7,
                color: task.description ? WOW_INK : WOW_MUTED,
                fontStyle: task.description ? "normal" : "italic",
                whiteSpace: "pre-wrap",
                margin: 0,
                padding: "var(--space-lg)",
              }}
            >
              {task.description || t("wow.askingEmpty")}
            </p>
          </WowQuestFrame>
        </section>

        {/* ── glory so far ── */}
        <section>
          <WowSectionHead>{t("wow.gloryHeading")}</WowSectionHead>
          {voteCount > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)" }}>
              <span
                style={{
                  fontFamily: WOW_DISPLAY,
                  fontSize: "var(--text-display)",
                  lineHeight: 0.85,
                  color: WOW_FIGURE,
                }}
              >
                {topScore}
              </span>
              <div style={{ paddingBottom: "var(--space-xs)" }}>
                <div
                  className="content-text"
                  style={{ fontFamily: WOW_DISPLAY, color: WOW_INK }}
                >
                  {t("wow.glory.top")}
                </div>
                <div className="eyebrow" style={{ color: WOW_MUTED, marginTop: "var(--space-xs)" }}>
                  {t("wow.glory.judged", { count: voteCount })}
                </div>
              </div>
            </div>
          ) : (
            <p
              className="content-text"
              style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_MUTED, margin: 0 }}
            >
              {t("wow.glory.none")}
            </p>
          )}
        </section>

        {/* ── chronicles sealed ── */}
        <section>
          <WowSectionHead
            trailing={
              <div style={{ display: "flex", gap: "var(--space-xs)" }}>
                {(["score", "recent"] as const).map((sort) => {
                  const on = submissionSort === sort;
                  return (
                    <button
                      key={sort}
                      type="button"
                      onClick={() => setSubmissionSort(sort)}
                      className="eyebrow"
                      style={{
                        minHeight: 46,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        padding: "var(--space-xs) var(--space-md)",
                        borderRadius: 7,
                        color: on ? "var(--faction-wow-quest-text)" : WOW_DEEP,
                        background: on
                          ? "linear-gradient(180deg, var(--faction-wow-quest-from), var(--faction-wow-quest-to))"
                          : WOW_PLATE,
                        border: `1.5px solid ${on ? "var(--faction-wow-quest-border)" : WOW_RULE}`,
                      }}
                    >
                      {sort === "score" ? t("wow.sort.mostGlorious") : t("wow.sort.recent")}
                    </button>
                  );
                })}
              </div>
            }
          >
            {t("wow.chroniclesHeading", { count: submissions.length })}
          </WowSectionHead>

          {sortedSubmissions.length === 0 ? (
            <p
              className="content-text"
              style={{ fontFamily: WOW_BODY, fontStyle: "italic", color: WOW_MUTED, margin: 0 }}
            >
              {t("wow.empty")}
            </p>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
                {sortedSubmissions.slice(0, 4).map((praxis) => (
                  <PraxisCard key={praxis.id} praxis={praxis} />
                ))}
              </div>
              {submissions.length > 4 && (
                <div style={{ marginTop: "var(--space-lg)", textAlign: "center" }}>
                  <Link
                    to={`/praxes?task_id=${task.id}`}
                    className="content-text"
                    style={{ fontFamily: WOW_DISPLAY, color: WOW_DEEP, textDecoration: "none" }}
                  >
                    {t("wow.viewAll", { count: submissions.length })}
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── the one primary verb, pinned above the tab bar ── */}
      {canSignUp && (
        <MobileStickyBar>
          <LevelJumpBanner state={state} />
          <WowCheckerBand height={3} />
          {signupError && (
            <p
              className="content-text"
              style={{ fontFamily: WOW_BODY, color: "var(--color-danger)", margin: 0 }}
            >
              {signupError}
            </p>
          )}
          <button type="button" onClick={handleSignup} className="wow-btn" style={wowGiltButton}>
            <WowSpark color="var(--faction-wow-quest-text)" />
            {t("wow.signup.cta", { points: modifiedPoints })}
          </button>
          <MobileStickyCaption color={WOW_MUTED}>
            {t("wow.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: "row", alignItems: "center", gap: "var(--space-md)" }}>
          <span
            className="content-text"
            style={{ fontFamily: WOW_DISPLAY, color: WOW_FIGURE, flex: 1 }}
          >
            {t("wow.submitted.text")}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{ ...wowGiltButton, width: "auto" }}
            className="wow-btn"
          >
            {t("wow.submitted.edit")}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: "row", alignItems: "center", gap: "var(--space-md)" }}>
          <button type="button" onClick={handleDrop} style={{ ...wowGhostButton, flex: "0 1 auto" }}>
            {t("wow.inProgress.drop")}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{ ...wowGiltButton, width: "auto", marginLeft: "auto" }}
            className="wow-btn"
          >
            {t("wow.inProgress.continue")}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  );
}
