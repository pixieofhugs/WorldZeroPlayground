import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { factionCssVar, factionFill, factionName } from "../../../utils/factions";
import { MobileStickyBar, MobileStickyCaption } from "./shared";
import { LevelJumpBanner } from "../archetypes/shared";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Default / na (Unaffiliated) MOBILE task-detail skin — the phone form of the
 * "open dossier" (#967): single column, thumb-first. A rainbow-bordered
 * reference hero (ring glyph, "Unaffiliated · counts for everyone" eyebrow,
 * italic display title, Points/Level/Signed-up chips), the brief (rainbow
 * left-border quote block), the filed-praxis list (live na {@link PraxisCard}),
 * and a **sticky bottom action bar** carrying the one primary verb (sign up /
 * continue / edit) while the body scrolls. The full-page `.na-backdrop` spectrum
 * wash (index.css) sits behind it.
 *
 * Backs na + every faction without a bespoke mobile skin; those tasks show the
 * real faction name via `factionName` but wear the na dossier. Tokens only:
 * `--faction-default-*` reached via the token / `factionFill` (NOT
 * `factionCssVar`, neutral grey for na) + the `--color-*` chrome tokens.
 */
export default function DefaultTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const {
    task,
    submissions,
    signups,
    mySubmission,
    isInProgress,
    inProgressPraxisId,
    canSignUp,
    slotsOpen,
    maxTaskSlots,
    modifiedPoints,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state;

  if (!task) return null;

  const slug = task.primary_faction_slug;
  const isMetatask = task.task_type === "metatask";

  const statChips: { label: string; value: number }[] = [
    { label: t("default.reference.points"), value: task.point_value },
    { label: t("default.reference.level"), value: task.level_required },
    { label: t("default.reference.signedUp"), value: signups.length },
  ];

  return (
    <div className="py-4" style={{ position: "relative" }}>
      {/* Full-page spectrum wash — the na "all paths open" backdrop. */}
      <div className="na-backdrop" aria-hidden />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Breadcrumb */}
        <nav
          className="font-body mb-3"
          style={{
            fontSize: "var(--text-base)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-text-tertiary)",
          }}
        >
          <Link to="/tasks" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>
            {t("default.breadcrumb")}
          </Link>
          <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>›</span>
          <span style={{ color: "var(--color-text-primary)" }}>{factionName(slug)}</span>
        </nav>

        {/* Hero — reference dossier */}
        <div
          className="mb-4"
          style={{
            borderRadius: 16,
            padding: "var(--space-xs)",
            background: "var(--faction-default-rainbow)",
            boxShadow: "0 14px 34px -24px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              borderRadius: 12,
              background: "var(--faction-default-card-bg)",
              color: "var(--faction-default-card-text)",
              padding: "var(--space-lg)",
            }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ flexWrap: "wrap" }}>
              <span
                aria-hidden
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  flex: "none",
                  background: "var(--faction-default-ring)",
                  WebkitMask: "radial-gradient(circle, transparent 38%, #000 40%)",
                  mask: "radial-gradient(circle, transparent 38%, #000 40%)",
                }}
              />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--faction-default-card-muted)",
                }}
              >
                {factionName(slug)} · {t("default.reference.eyebrowTag")}
              </span>
              {isMetatask && (
                <span
                  className="font-body"
                  style={{
                    fontSize: "var(--text-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    padding: "var(--space-xs) var(--space-sm)",
                    borderRadius: 4,
                    fontWeight: 700,
                    ...factionFill(task.metatask_faction_slug, "pill"),
                  }}
                >
                  {t("default.meta")}
                </span>
              )}
            </div>

            <h1
              className="font-display italic content-title"
              style={{
                fontWeight: 700,
                lineHeight: 1.05,
                margin: 0,
                color: "var(--faction-default-card-text)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h1>

            {isMetatask && (
              <p
                className="eyebrow"
                style={{
                  marginTop: "var(--space-sm)",
                  marginBottom: 0,
                  color: factionCssVar(task.metatask_faction_slug),
                }}
              >
                {t("default.metataskFor", {
                  faction: factionName(task.metatask_faction_slug),
                })}
              </p>
            )}

            {/* Stat chips — wrap, no fixed grid */}
            <div className="flex flex-wrap gap-2" style={{ marginTop: "var(--space-lg)" }}>
              {statChips.map((chip) => (
                <div
                  key={chip.label}
                  style={{
                    borderRadius: 8,
                    border: "1px solid var(--faction-default-border)",
                    padding: "var(--space-sm) var(--space-md)",
                    flex: "1 0 28%",
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--faction-default-card-muted)",
                    }}
                  >
                    {chip.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-accent)",
                      fontSize: "var(--text-title)",
                      lineHeight: 0.9,
                      color: "var(--faction-default-card-text)",
                      marginTop: "var(--space-xs)",
                    }}
                  >
                    {chip.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* The brief */}
        <div className="mb-4">
          <div
            className="font-display italic"
            style={{
              display: "inline-block",
              fontSize: "var(--text-title)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--space-md)",
            }}
          >
            {t("default.brief.heading")}
          </div>
          <div
            style={{
              borderRadius: 12,
              background: "var(--color-bg-surface-alt)",
              border: "1px solid var(--color-border)",
              borderLeft: "4px solid transparent",
              borderImage: "var(--faction-default-rainbow) 1",
              padding: "var(--space-lg)",
            }}
          >
            {task.description && (
              <p
                className="font-body content-text"
                style={{
                  lineHeight: 1.8,
                  color: "var(--color-text-secondary)",
                  whiteSpace: "pre-wrap",
                  margin: "0 0 var(--space-md)",
                }}
              >
                {task.description}
              </p>
            )}
            <p
              className="font-body content-text"
              style={{ lineHeight: 1.8, color: "var(--color-text-secondary)", margin: 0 }}
            >
              {t("default.brief.secondary")}
            </p>
          </div>
        </div>

        {/* Filed praxis */}
        <div>
          <div className="flex items-center justify-between mb-3" style={{ gap: "var(--space-md)", flexWrap: "wrap" }}>
            <span
              className="font-display italic"
              style={{ fontSize: "var(--text-title)", color: "var(--color-text-primary)" }}
            >
              {t("default.filedHeading")}
            </span>
            <div className="flex">
              {(["score", "recent"] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSubmissionSort(sort)}
                  className="font-body"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    padding: "var(--space-xs) var(--space-md)",
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
                <div style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
                  <Link
                    to={`/praxes?task_id=${task.id}`}
                    className="font-body"
                    style={{
                      fontSize: "var(--text-md)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--faction-default-card-accent)",
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

        {/* Sticky action bar — the mobile CTA pattern; carries the one primary verb. */}
        {canSignUp && (
          <MobileStickyBar>
            <LevelJumpBanner state={state} />
            {signupError && (
              <div
                className="font-body"
                style={{
                  fontSize: "var(--text-lg)",
                  color: "var(--color-danger)",
                  padding: "var(--space-sm) var(--space-md)",
                  background: "var(--faction-default-light)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {signupError}
              </div>
            )}
            <button
              onClick={handleSignup}
              style={{
                width: "100%",
                background: "var(--color-text-primary)",
                color: "var(--color-bg-page)",
                fontFamily: "var(--font-accent)",
                fontSize: "var(--text-xl)",
                letterSpacing: "0.06em",
                padding: "var(--space-lg) var(--space-xl)",
                border: "none",
                borderRadius: 6,
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
            <span className="eyebrow flex-1" style={{ color: "var(--faction-default-card-accent)" }}>
              {t("default.submitted.badge")}
            </span>
            <Link
              to={`/praxes/${mySubmission.id}/edit`}
              className="btn-outline"
              style={{ fontSize: "var(--text-sm)", padding: "var(--space-sm) var(--space-lg)" }}
            >
              {t("default.submitted.edit")}
            </Link>
          </MobileStickyBar>
        )}

        {!mySubmission && isInProgress && inProgressPraxisId !== null && (
          <MobileStickyBar style={{ flexDirection: "row", alignItems: "center", gap: "var(--space-md)" }}>
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
                background: "var(--color-text-primary)",
                color: "var(--color-bg-page)",
                fontFamily: "var(--font-accent)",
                fontSize: "var(--text-lg)",
                letterSpacing: "0.04em",
                padding: "var(--space-md) var(--space-xl)",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              {t("default.inProgress.continue")}
            </Link>
          </MobileStickyBar>
        )}
      </div>
    </div>
  );
}
