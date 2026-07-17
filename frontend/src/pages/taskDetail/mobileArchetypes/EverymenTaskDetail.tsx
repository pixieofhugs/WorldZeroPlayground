import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { MobileStickyBar, MobileStickyCaption } from "./shared";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Everymen MOBILE task-detail skin — the FIRST bespoke faction mobile skin
 * (#497). The union WORK ORDER, phone-shaped: a red masthead billboard with the
 * cog seal and knockout Bebas headline, the typewritten "Order" body, the
 * filed work reports, and a stamped **sticky action bar** ("Report for duty")
 * pinned above the tab bar. Single-column, no fixed-px grid — the desktop
 * broadsheet's wide poster would overflow a 375px viewport. Reuses the same
 * {@link TaskDetailState}, the shared mobile sticky bar, and the exact
 * everymen.* copy keys + `--everymen-*` tokens as the desktop archetype, so the
 * surface flips with the theme without mutating the document theme.
 */

const INK = "var(--everymen-ink)";
const CREAM = "var(--everymen-cream)";
const RED = "var(--everymen-red)";
const RED_DEEP = "var(--everymen-red-deep)";
const GOLD = "var(--everymen-gold)";
const OLIVE = "var(--everymen-olive)";
const MUTED = "var(--everymen-muted)";
const PAPER = "var(--everymen-paper)";
const ACCENT_FONT = "var(--font-accent)";
const BODY_FONT = "var(--font-body)";

/** The Everymen cog seal — a riveted gear, the union's mark. */
function CogSeal({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <g fill={GOLD}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="11"
            y="0.5"
            width="2"
            height="5"
            rx="0.5"
            transform={`rotate(${deg} 12 12)`}
          />
        ))}
      </g>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={GOLD} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2" fill={GOLD} />
    </svg>
  );
}

/** Section header — Bebas heading with the red/gold picket rule. */
function SectionHead({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <h2
        className="content-title"
        style={{
          fontFamily: ACCENT_FONT,
          letterSpacing: "0.04em",
          margin: 0,
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>
      <span
        style={{
          flex: 1,
          height: 3,
          background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)`,
        }}
      />
      {trailing}
    </div>
  );
}

export default function EverymenTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const {
    task,
    signups,
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

  const statusVoice =
    task.status === "active" ? t("everymen.statusOpen") : task.status;
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  const stamp = (background: string, textColor: string, label: string) => (
    <span
      className="content-title"
      style={{
        background,
        color: textColor,
        fontFamily: ACCENT_FONT,
        letterSpacing: "0.06em",
        padding: "4px 12px",
      }}
    >
      {label}
    </span>
  );

  return (
    <div
      className="py-4"
      style={{ fontFamily: BODY_FONT, color: INK, background: PAPER, marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}
    >
      {/* Breadcrumb */}
      <nav
        className="mb-3"
        style={{
          fontFamily: BODY_FONT,
          fontSize: "var(--text-base)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        <Link to="/tasks" style={{ color: RED, textDecoration: "none" }}>
          {t("everymen.breadcrumb")}
        </Link>
        <span style={{ opacity: 0.5, margin: "0 6px" }}>›</span>
        <span style={{ color: RED }}>{task.title}</span>
      </nav>

      {/* Hero — union billboard */}
      <div style={{ position: "relative", overflow: "hidden", border: `3px solid ${INK}`, background: RED, color: CREAM, marginBottom: 20 }}>
        {/* sunburst rays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.5,
            background: `repeating-conic-gradient(from 0deg at 24% 30%, ${RED_DEEP} 0deg 7deg, transparent 7deg 14deg)`,
          }}
        />
        {/* seal + status banner */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            background: INK,
            padding: "8px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: GOLD }}>
            <CogSeal size={16} />
            <span style={{ fontFamily: ACCENT_FONT, fontSize: "var(--text-xl)", letterSpacing: "0.2em" }}>
              {t("everymen.masthead")}
            </span>
          </div>
          <span
            style={{
              fontSize: "var(--text-xs)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: CREAM,
              border: `1.5px solid ${GOLD}`,
              padding: "2px 8px",
            }}
          >
            {statusVoice}
          </span>
        </div>
        <div style={{ height: 4, background: GOLD, position: "relative", zIndex: 2 }} />
        <div style={{ position: "relative", zIndex: 2, padding: "20px 18px 22px" }}>
          <div
            className="content-title"
            style={{
              fontFamily: ACCENT_FONT,
              lineHeight: 0.92,
              letterSpacing: "0.01em",
              color: CREAM,
              textShadow: `2px 2px 0 ${INK}`,
              overflowWrap: "anywhere",
            }}
          >
            {task.title}
          </div>
          <div style={{ height: 3, background: GOLD, width: 96, margin: "16px 0 14px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {stamp(INK, CREAM, t("everymen.levelValue", { level: task.level_required }))}
            {stamp(GOLD, INK, t("everymen.pointsValue", { points: modifiedPoints }))}
          </div>
          <div style={{ fontFamily: BODY_FONT, fontSize: "var(--text-base)", letterSpacing: "0.06em", color: CREAM, marginTop: 12 }}>
            {t("everymen.onView", { signups: signups.length, completed: submissions.length })}
          </div>
        </div>
      </div>

      {/* The Order — the work-order body */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t("everymen.orderHeading")} />
        <div style={{ border: `1.5px solid ${INK}`, background: PAPER, padding: "18px 20px" }}>
          <p
            className="content-text"
            style={{
              fontFamily: BODY_FONT,
              lineHeight: 1.75,
              color: INK,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {task.description || t("everymen.orderEmpty")}
          </p>
        </div>
      </section>

      {/* Hall verdict (read-only aggregate) */}
      <section style={{ marginBottom: 20 }}>
        <SectionHead title={t("everymen.verdictHeading")} />
        {voteCount > 0 ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
            <span className="content-title" style={{ fontFamily: ACCENT_FONT, lineHeight: 0.8, color: RED }}>
              {topScore}
            </span>
            <div style={{ paddingBottom: 5 }}>
              <div style={{ fontFamily: ACCENT_FONT, fontSize: "var(--text-xl)", letterSpacing: "0.06em", color: INK }}>
                {t("everymen.verdict.topMark")}
              </div>
              <div style={{ fontFamily: BODY_FONT, fontSize: "var(--text-base)", letterSpacing: "0.06em", color: MUTED }}>
                {t("everymen.verdict.reports", { count: voteCount })}
              </div>
            </div>
          </div>
        ) : (
          <p className="content-text" style={{ fontFamily: BODY_FONT, color: MUTED, margin: 0 }}>
            {t("everymen.verdict.none")}
          </p>
        )}
      </section>

      {/* Work reports filed (completions) */}
      <section>
        <SectionHead
          title={t("everymen.reportsHeading")}
          trailing={
            <div style={{ display: "flex" }}>
              {(["score", "recent"] as const).map((sort) => {
                const on = submissionSort === sort;
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: BODY_FONT,
                      fontSize: "var(--text-sm)",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "5px 10px",
                      background: on ? INK : "transparent",
                      color: on ? CREAM : MUTED,
                      border: `1.5px solid ${
                        on ? INK : "color-mix(in srgb, var(--everymen-ink) 30%, transparent)"
                      }`,
                      cursor: "pointer",
                    }}
                  >
                    {sort === "score" ? t("everymen.sort.topRated") : t("everymen.sort.recent")}
                  </button>
                );
              })}
            </div>
          }
        />
        {sortedSubmissions.length === 0 ? (
          <p className="content-text" style={{ fontFamily: BODY_FONT, color: MUTED, margin: 0 }}>
            {t("everymen.empty")}
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {sortedSubmissions.slice(0, 4).map((s) => (
                <div key={s.id} style={{ position: "relative", paddingTop: s.id === topId ? 18 : 0 }}>
                  {s.id === topId && (
                    <div
                      style={{
                        position: "absolute",
                        top: -4,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 3,
                        whiteSpace: "nowrap",
                        background: GOLD,
                        color: INK,
                        fontFamily: ACCENT_FONT,
                        fontSize: "var(--text-lg)",
                        letterSpacing: "0.1em",
                        padding: "2px 12px",
                        boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <span style={{ fontSize: "var(--text-lg)", lineHeight: 1 }}>⚜</span>{" "}
                      {t("everymen.bestInHall")}
                    </div>
                  )}
                  <PraxisCard praxis={s} />
                </div>
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ marginTop: 16 }}>
                <Link
                  to={`/praxes?task_id=${task.id}`}
                  style={{ fontFamily: ACCENT_FONT, fontSize: "var(--text-xl)", letterSpacing: "0.06em", color: RED, textDecoration: "none" }}
                >
                  {t("everymen.viewAll", { count: submissions.length })}
                </Link>
              </div>
            )}
          </>
        )}
      </section>

      {/* Sticky action bar — stamped CTA / signed-on state */}
      {canSignUp && (
        <MobileStickyBar>
          {signupError && (
            <div
              className="font-body"
              style={{ fontSize: "var(--text-lg)", color: RED_DEEP, padding: "8px 12px", background: "color-mix(in srgb, var(--everymen-red) 8%, transparent)", border: `1px solid ${RED}` }}
            >
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: "100%",
              background: RED,
              color: CREAM,
              fontFamily: BODY_FONT,
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "14px 20px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("everymen.signup.cta")}
          </button>
          <MobileStickyCaption color={MUTED}>
            {t("everymen.signup.meta", { points: modifiedPoints, open: slotsOpen, max: maxTaskSlots })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: "row", alignItems: "center" }}>
          <span className="content-text" style={{ fontFamily: ACCENT_FONT, letterSpacing: "0.08em", color: OLIVE, flex: 1 }}>
            {t("everymen.submitted.text")}
          </span>
          <Link
            to={`/praxes/${mySubmission.id}/edit`}
            style={{
              fontFamily: BODY_FONT,
              fontSize: "var(--text-md)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "10px 18px",
              background: INK,
              color: CREAM,
              textDecoration: "none",
            }}
          >
            {t("everymen.submitted.edit")}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleDrop}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: BODY_FONT,
              fontSize: "var(--text-base)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {t("everymen.inProgress.drop")}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{
              marginLeft: "auto",
              fontFamily: BODY_FONT,
              fontSize: "var(--text-md)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "12px 20px",
              background: RED,
              color: CREAM,
              textDecoration: "none",
            }}
          >
            {t("everymen.inProgress.continue")}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  );
}
