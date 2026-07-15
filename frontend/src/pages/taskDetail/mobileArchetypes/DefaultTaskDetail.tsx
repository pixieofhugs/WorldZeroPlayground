import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import LevelPill from "../../../components/ui/LevelPill";
import DefaultSigil from "../../../components/cards/DefaultSigil";
import { factionCssVar, factionName } from "../../../utils/factions";
import { MobileStickyBar, MobileStickyCaption } from "./shared";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Default MOBILE task-detail skin — the na (Unaffiliated) language of the Field
 * Kit (#495): single-column, thumb-first, no fixed-px two-column grid. A tinted
 * hero (title, faction, level, points, description), the completed-praxis list,
 * and a **sticky bottom action bar** that carries the one primary verb (sign up
 * / continue / edit) above the tab bar while the body scrolls. Consumes the same
 * {@link TaskDetailState} + copy keys as the desktop archetypes; every faction
 * without a bespoke mobile skin falls through here (#496–#500).
 */
export default function DefaultTaskDetail({ state }: { state: TaskDetailState }) {
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
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state;

  if (!task) return null;

  // Tint by the task's own faction; na / unknown falls back to the neutral
  // default token (this skin backs na + every faction without a bespoke skin).
  const slug = task.primary_faction_slug;
  const color =
    slug && slug !== "na" ? factionCssVar(slug) : "var(--faction-default)";

  return (
    <div className="py-4">
      {/* Breadcrumb */}
      <nav
        className="font-body mb-3"
        style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--color-text-tertiary)" }}
      >
        <Link to="/tasks" style={{ color: "var(--faction-ephemerists)", textDecoration: "none" }}>
          {t("default.breadcrumb")}
        </Link>
        {" › "}
        <span style={{ color: "var(--color-text-primary)" }}>{task.title}</span>
      </nav>

      {/* Hero */}
      <div className="sidebar-card mb-4" style={{ borderLeft: `4px solid ${color}`, padding: "16px 18px" }}>
        <div className="flex items-center gap-2 mb-2">
          <DefaultSigil size={18} />
          <span className="eyebrow" style={{ color }}>{factionName(task.primary_faction_slug)}</span>
          <LevelPill level={task.level_required} />
        </div>

        <h1
          className="font-display italic font-medium mb-2"
          style={{ fontSize: 24, color: "var(--color-text-primary)", lineHeight: 1.2 }}
        >
          {task.title}
        </h1>

        {/* Stats — wrap, no fixed grid */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { label: t("default.stats.basePoints"), value: task.point_value },
            { label: t("default.stats.yourPoints", { multiplier: state.factionMultiplier }), value: modifiedPoints },
            { label: t("default.stats.topScore"), value: topScore },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center py-2 px-3"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-surface)", flex: "1 0 28%" }}
            >
              <div className="font-body font-bold text-lg" style={{ color: "var(--color-text-primary)" }}>{stat.value}</div>
              <div className="eyebrow" style={{ fontSize: 7 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {task.description && (
          <p
            className="font-body"
            style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-secondary)", whiteSpace: "pre-wrap" }}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* Completed praxis */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <span className="eyebrow">{t("default.completedHeading", { count: submissions.length })}</span>
          <div className="flex">
            {(["score", "recent"] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => setSubmissionSort(sort)}
                style={{
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "5px 12px",
                  background: submissionSort === sort ? "var(--color-text-primary)" : "transparent",
                  color: submissionSort === sort ? "var(--color-bg-page)" : "var(--color-text-tertiary)",
                  border: `1px solid ${submissionSort === sort ? "transparent" : "var(--color-border)"}`,
                  cursor: "pointer",
                }}
              >
                {sort === "score" ? t("default.sort.topRated") : t("default.sort.recent")}
              </button>
            ))}
          </div>
        </div>

        {sortedSubmissions.length === 0 ? (
          <p className="font-body text-muted">{t("default.empty")}</p>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {sortedSubmissions.slice(0, 4).map((s) => (
                <PraxisCard key={s.id} praxis={s} />
              ))}
            </div>
            {submissions.length > 4 && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <Link
                  to={`/praxes?task_id=${task.id}`}
                  style={{ fontFamily: "'Courier Prime', monospace", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--faction-ephemerists)", textDecoration: "none" }}
                >
                  {t("default.viewAll", { count: submissions.length })}
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky action bar — the mobile CTA pattern; carries the one primary verb. */}
      {canSignUp && (
        <MobileStickyBar>
          {signupError && (
            <div
              className="font-body"
              style={{ fontSize: 12, color: "var(--color-danger)", padding: "8px 12px", background: "var(--faction-default-light)", border: "1px solid var(--color-border)" }}
            >
              {signupError}
            </div>
          )}
          <button
            onClick={handleSignup}
            style={{
              width: "100%",
              background: color,
              color: "var(--color-text-on-accent)",
              fontFamily: "'Courier Prime', monospace",
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              padding: "14px 20px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("default.signup.cta", { points: modifiedPoints })}
          </button>
          <MobileStickyCaption>
            {t("default.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
          </MobileStickyCaption>
        </MobileStickyBar>
      )}

      {mySubmission && (
        <MobileStickyBar style={{ flexDirection: "row", alignItems: "center" }}>
          <span className="eyebrow flex-1" style={{ color }}>{t("default.submitted.badge")}</span>
          <Link to={`/praxes/${mySubmission.id}/edit`} className="btn-outline" style={{ fontSize: 9, padding: "8px 18px" }}>
            {t("default.submitted.edit")}
          </Link>
        </MobileStickyBar>
      )}

      {!mySubmission && isInProgress && inProgressPraxisId !== null && (
        <MobileStickyBar style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleDrop}
            className="eyebrow"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}
          >
            {t("default.inProgress.drop")}
          </button>
          <Link
            to={`/praxes/${inProgressPraxisId}/edit`}
            style={{
              marginLeft: "auto",
              background: color,
              color: "var(--color-text-on-accent)",
              fontFamily: "'Courier Prime', monospace",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              padding: "12px 20px",
              textDecoration: "none",
            }}
          >
            {t("default.inProgress.continue")}
          </Link>
        </MobileStickyBar>
      )}
    </div>
  );
}
