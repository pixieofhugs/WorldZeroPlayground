import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import LevelPill from "../../../components/ui/LevelPill";
import FeedBadge from "../../../components/feed/FeedBadge";
import DefaultSigil from "../../../components/cards/DefaultSigil";
import { factionCssVar, factionName } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import type { TaskDetailState } from "../useTaskDetail";

const VISIBLE_SIGNUPS = 4;

/**
 * Default task-detail archetype — the original universal layout, now consuming
 * the shared {@link TaskDetailState}. Any faction without a bespoke archetype
 * falls through to this, so it must stay visually identical to the pre-refactor
 * page.
 */
export default function DefaultTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
  const { t } = useTranslation("tasks");
  const {
    task,
    submissions,
    signups,
    friends,
    foes,
    mySubmission,
    isInProgress,
    inProgressPraxisId,
    canSignUp,
    slotsOpen,
    maxTaskSlots,
    factionMultiplier,
    modifiedPoints,
    topScore,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state;

  // Guarded non-null by the dispatcher.
  if (!task) return null;

  // Unaffiliated / no-faction fallback — the spectrum default skin (#418), not
  // the borrowed UA tint. The neutral --faction-default carries buttons/borders;
  // the rainbow band + sigil carry the "all paths open" signature.
  const color = "var(--faction-default)";
  const fname = factionName(task.primary_faction_slug);
  const showMultiplierTile = factionMultiplier !== 1.0;

  return (
    <div className="py-8">
      {/* ── Breadcrumb ── */}
      <nav
        className="font-body mb-4"
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "var(--color-text-tertiary)",
        }}
      >
        <Link
          to="/tasks"
          style={{ color: "var(--faction-ephemerists)", textDecoration: "none" }}
        >
          {t("default.breadcrumb")}
        </Link>
        {" › "}
        <span style={{ color: "var(--color-text-primary)" }}>{task.title}</span>
      </nav>

      {/* ── Two-Column Layout ── */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* ── Main Column ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ── Task Hero Block ── */}
          <div
            className="sidebar-card mb-5"
            style={{ borderLeft: `4px solid ${color}`, padding: "18px 22px" }}
          >
            {/* Faction pennant + status + level */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <DefaultSigil size={20} />
              <span
                className="pennant-shape"
                style={{
                  display: "inline-block",
                  background: "var(--faction-default-rainbow)",
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  padding: "3px 14px",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                {fname}
              </span>
              <span
                className="font-body"
                style={{
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "2px 8px",
                  borderRadius: 4,
                  background:
                    task.status === "active"
                      ? "var(--faction-everymen-light)"
                      : "var(--color-bg-surface-alt)",
                  color:
                    task.status === "active"
                      ? "var(--faction-everymen)"
                      : "var(--color-text-tertiary)",
                }}
              >
                {task.status}
              </span>
              {task.task_type === "metatask" && (
                <span
                  className="font-body"
                  style={{
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: factionCssVar(task.metatask_faction_slug),
                    color: "var(--color-text-on-accent)",
                    fontWeight: 700,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {t("default.meta")}
                </span>
              )}
              <LevelPill level={task.level_required} />
            </div>

            {/* Title */}
            <h1
              className="font-display italic font-medium"
              style={{
                fontSize: 28,
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
                marginBottom: task.task_type === "metatask" ? 4 : 12,
              }}
            >
              {task.title}
            </h1>

            {/* Metatask-for line */}
            {task.task_type === "metatask" && (
              <p
                className="eyebrow"
                style={{
                  marginBottom: 12,
                  color: factionCssVar(task.metatask_faction_slug),
                }}
              >
                {t("default.metataskFor", {
                  faction: factionName(task.metatask_faction_slug),
                })}
              </p>
            )}

            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${showMultiplierTile ? 5 : 4}, 1fr)`,
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { label: t("default.stats.basePoints"), value: task.point_value },
                ...(showMultiplierTile
                  ? [
                      {
                        label: t("default.stats.yourPoints", {
                          multiplier: factionMultiplier,
                        }),
                        value: modifiedPoints,
                      },
                    ]
                  : []),
                { label: t("default.stats.completed"), value: submissions.length },
                { label: t("default.stats.inProgress"), value: signups.length },
                { label: t("default.stats.topScore"), value: topScore },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center py-2"
                  style={{
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg-surface)",
                  }}
                >
                  <div
                    className="font-body font-bold text-lg"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {stat.value}
                  </div>
                  <div className="eyebrow" style={{ fontSize: 7 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {task.description && (
              <p
                className="font-body"
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--color-text-secondary)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description}
              </p>
            )}
          </div>

          {/* ── Signup Block ── */}
          {canSignUp && (
            <div className="sidebar-card mb-5" style={{ padding: "16px 20px" }}>
              <button
                onClick={handleSignup}
                style={{
                  width: "100%",
                  background: color,
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  padding: "10px 20px",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 3,
                    border: "1px dashed rgba(255,255,255,0.25)",
                    pointerEvents: "none",
                  }}
                />
                {t("default.signup.cta", { points: modifiedPoints })}
              </button>

              <div
                className="eyebrow"
                style={{
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {t("default.signup.slots", {
                    open: slotsOpen,
                    max: maxTaskSlots,
                  })}
                </span>
                <span>
                  {t("default.signup.levelRequired", {
                    level: task.level_required,
                  })}{" "}
                  <span className="eyebrow">{t("default.signup.met")}</span>
                </span>
              </div>

              {signupError && (
                <div
                  className="font-body"
                  style={{
                    fontSize: 11,
                    color: "var(--color-danger)",
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "rgba(220,38,38,0.06)",
                    border: "1px solid rgba(220,38,38,0.2)",
                  }}
                >
                  {signupError}
                </div>
              )}
            </div>
          )}

          {/* Already signed up / submitted states */}
          {mySubmission && (
            <div
              className="sidebar-card mb-5"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: "var(--faction-default-light)",
                  border: "1.5px solid var(--faction-default-border)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                <span className="eyebrow" style={{ color }}>
                  {t("default.submitted.badge")}
                </span>
                <span
                  className="font-body"
                  style={{ fontSize: 11, color: "var(--color-text-primary)" }}
                >
                  {t("default.submitted.text")}
                </span>
              </div>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                className="btn-outline"
                style={{ fontSize: 8, padding: "4px 12px" }}
              >
                {t("default.submitted.edit")}
              </Link>
            </div>
          )}

          {!mySubmission && isInProgress && inProgressPraxisId !== null && (
            <div
              className="sidebar-card mb-5"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: "var(--faction-default-light)",
                  border: "1.5px solid var(--faction-default-border)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                <span className="eyebrow" style={{ color }}>
                  {t("default.inProgress.badge")}
                </span>
                <span
                  className="font-body"
                  style={{ fontSize: 11, color: "var(--color-text-primary)" }}
                >
                  {t("default.inProgress.text")}
                </span>
              </div>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{
                  background: color,
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  padding: "8px 18px",
                  textDecoration: "none",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 3,
                    border: "1px dashed rgba(255,255,255,0.25)",
                    pointerEvents: "none",
                  }}
                />
                {t("default.inProgress.continue")}
              </Link>
              <button
                onClick={handleDrop}
                className="eyebrow"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-tertiary)",
                }}
              >
                {t("default.inProgress.drop")}
              </button>
            </div>
          )}

          {/* ── Completed Praxis Section ── */}
          <div className="mt-2">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span className="eyebrow">
                {t("default.completedHeading", { count: submissions.length })}
              </span>
              <div style={{ display: "flex", gap: 0 }}>
                {(["score", "recent"] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      padding: "4px 10px",
                      background:
                        submissionSort === sort
                          ? "var(--color-text-primary)"
                          : "transparent",
                      color:
                        submissionSort === sort
                          ? "var(--color-bg-page)"
                          : "var(--color-text-tertiary)",
                      border: `1px solid ${submissionSort === sort ? "transparent" : "var(--color-border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {sort === "score"
                      ? t("default.sort.topRated")
                      : t("default.sort.recent")}
                  </button>
                ))}
              </div>
            </div>

            {sortedSubmissions.length === 0 ? (
              <p className="font-body text-muted">{t("default.empty")}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 items-start">
                  {sortedSubmissions.slice(0, 4).map((s) => (
                    <PraxisCard key={s.id} praxis={s} />
                  ))}
                </div>
                {submissions.length > 4 && (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <Link
                      to={`/praxes?task_id=${task.id}`}
                      style={{
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--faction-ephemerists)",
                        textDecoration: "none",
                      }}
                    >
                      {t("default.viewAll", { count: submissions.length })}
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Sidebar Column ── */}
        <div style={{ width: 240, flexShrink: 0 }}>
          {/* Players in Progress */}
          <div className="sidebar-card mb-3">
            <p className="eyebrow mb-2">
              {t("default.playersInProgress", { count: signups.length })}
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              {signups.slice(0, VISIBLE_SIGNUPS).map((signup) => {
                const isFriend = friends.has(signup.character_id);
                const isFoe = foes.has(signup.character_id);
                return (
                  <div
                    key={signup.character_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 0",
                    }}
                  >
                    <Link to={`/characters/${signup.character_id}`}>
                      {signup.avatar_url ? (
                        <img
                          src={mediaUrl(signup.avatar_url)}
                          alt={signup.display_name}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${factionCssVar(signup.faction_slug, "light")}, ${factionCssVar(signup.faction_slug)})`,
                          }}
                        />
                      )}
                    </Link>
                    <Link
                      to={`/characters/${signup.character_id}`}
                      className="font-body"
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                        textDecoration: "none",
                        flex: 1,
                      }}
                    >
                      {signup.display_name}
                    </Link>
                    {isFriend && (
                      <FeedBadge type="friend" label={t("default.friend")} />
                    )}
                    {isFoe && <FeedBadge type="duel" label={t("default.foe")} />}
                  </div>
                );
              })}
            </div>
            {signups.length > VISIBLE_SIGNUPS && (
              <p
                className="eyebrow"
                style={{ marginTop: 6, color: "var(--color-text-tertiary)" }}
              >
                {t("default.moreSignups", {
                  count: signups.length - VISIBLE_SIGNUPS,
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
