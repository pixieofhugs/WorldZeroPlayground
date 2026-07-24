import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import FeedBadge from "../../../components/feed/FeedBadge";
import { factionCssVar, factionFill, factionName } from "../../../utils/factions";
import { mediaUrl } from "../../../utils/media";
import { LevelJumpBanner, ErrorBanner } from "./shared";
import type { TaskDetailState } from "../useTaskDetail";

const VISIBLE_SIGNUPS = 4;

/**
 * Default / na (Unaffiliated) task-detail archetype — "the task as a full open
 * dossier" (design project 1eb2665a, #967). One centred column: a
 * rainbow-bordered reference hero (ring glyph, "Unaffiliated · counts for
 * everyone" eyebrow, big italic display title, Points/Level/Signed-up stat
 * chips), a sign-up CTA bar, the brief (rainbow left-border quote block), the
 * filed praxis (live na {@link PraxisCard} stack), and — rendered by the
 * dispatcher below every archetype — the discussion thread.
 *
 * `default` ≡ `na` ≡ Unaffiliated is ONE identity, so this leans fully into the
 * spectrum-band na kit. It is also the fallback archetype for any faction
 * without a bespoke skin (e.g. WOW desktop, a tracked design bug — #951); those
 * tasks show the real faction name via `factionName`, but wear the na dossier.
 *
 * Tokens only: `--faction-default-*` (rainbow band, ring, card sheet) reached
 * via the token / `factionFill` (NOT `factionCssVar`, which is neutral grey for
 * na), plus the `--color-*` chrome tokens. The full-page `.na-backdrop` spectrum
 * wash lives in index.css.
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
    modifiedPoints,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state;

  // Guarded non-null by the dispatcher.
  if (!task) return null;

  const slug = task.primary_faction_slug;
  const isMetatask = task.task_type === "metatask";

  // Reused chip shell for the hero stat readouts.
  const statChips: { label: string; value: number }[] = [
    { label: t("default.reference.points"), value: task.point_value },
    { label: t("default.reference.level"), value: task.level_required },
    { label: t("default.reference.signedUp"), value: signups.length },
  ];

  return (
    <div className="py-8" style={{ position: "relative" }}>
      {/* Full-page spectrum wash — the na "all paths open" backdrop (rule in
          index.css, shared with DefaultProfile #969). */}
      <div className="na-backdrop" aria-hidden />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto" }}>
        {/* ── Breadcrumb ── */}
        <nav
          className="font-body"
          style={{
            fontSize: "var(--text-base)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-text-tertiary)",
            marginBottom: "var(--space-xl)",
          }}
        >
          <Link
            to="/tasks"
            style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
          >
            {t("default.breadcrumb")}
          </Link>
          <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>›</span>
          <span>{factionName(slug)}</span>
          <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>›</span>
          <span style={{ color: "var(--color-text-primary)" }}>{task.title}</span>
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
          {/* ── HERO — the reference dossier ── */}
          <div
            style={{
              borderRadius: 16,
              padding: "var(--space-xs)",
              background: "var(--faction-default-rainbow)",
              boxShadow: "0 18px 44px -26px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                borderRadius: 11,
                background: "var(--faction-default-card-bg)",
                color: "var(--faction-default-card-text)",
                padding: "var(--space-2xl)",
              }}
            >
              {/* eyebrow row: ring glyph + Unaffiliated tagline + optional META pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  flexWrap: "wrap",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 44,
                    height: 44,
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
                    letterSpacing: "0.2em",
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
                      // na → rainbow frame; real faction → solid hue + on-fill ink
                      ...factionFill(task.metatask_faction_slug, "pill"),
                    }}
                  >
                    {t("default.meta")}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1
                className="font-display italic"
                style={{
                  fontSize: "var(--text-display)",
                  fontWeight: 700,
                  lineHeight: 1,
                  margin: 0,
                  color: "var(--faction-default-card-text)",
                  overflowWrap: "anywhere",
                }}
              >
                {task.title}
              </h1>

              {/* Metatask-for line */}
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

              {/* Stat chips */}
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-md)",
                  flexWrap: "wrap",
                  marginTop: "var(--space-xl)",
                }}
              >
                {statChips.map((chip) => (
                  <div
                    key={chip.label}
                    style={{
                      borderRadius: 8,
                      border: "1px solid var(--faction-default-border)",
                      padding: "var(--space-sm) var(--space-lg)",
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

          {/* ── CTA bar / status bars ── */}
          {canSignUp && (
            <div>
              <LevelJumpBanner state={state} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-lg)",
                  flexWrap: "wrap",
                  borderRadius: 10,
                  background: "var(--color-bg-surface-alt)",
                  border: "1px solid var(--color-border)",
                  padding: "var(--space-lg)",
                }}
              >
                <button
                  onClick={handleSignup}
                  style={{
                    cursor: "pointer",
                    border: "none",
                    borderRadius: 6,
                    fontFamily: "var(--font-accent)",
                    fontSize: "var(--text-xl)",
                    letterSpacing: "0.04em",
                    padding: "var(--space-md) var(--space-xl)",
                    color: "var(--color-bg-page)",
                    background: "var(--color-text-primary)",
                  }}
                >
                  {t("default.signup.cta", { points: modifiedPoints })}
                </button>
                <div
                  className="font-display italic"
                  style={{ fontSize: "var(--text-md)", color: "var(--color-text-secondary)" }}
                >
                  {t("default.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: "var(--text-base)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {t("default.cta.noFaction")}
                </div>
              </div>
              <ErrorBanner message={signupError} />
            </div>
          )}

          {mySubmission && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                borderRadius: 10,
                background: "var(--color-bg-surface-alt)",
                border: "1px solid var(--color-border)",
                padding: "var(--space-lg)",
              }}
            >
              <span
                className="eyebrow"
                style={{ color: "var(--faction-default-card-accent)" }}
              >
                {t("default.submitted.badge")}
              </span>
              <span className="font-body content-text" style={{ color: "var(--color-text-primary)" }}>
                {t("default.submitted.text")}
              </span>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                className="btn-outline"
                style={{ marginLeft: "auto" }}
              >
                {t("default.submitted.edit")}
              </Link>
            </div>
          )}

          {!mySubmission && isInProgress && inProgressPraxisId !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                borderRadius: 10,
                background: "var(--color-bg-surface-alt)",
                border: "1px solid var(--color-border)",
                padding: "var(--space-lg)",
              }}
            >
              <span
                className="eyebrow"
                style={{ color: "var(--faction-default-card-accent)" }}
              >
                {t("default.inProgress.badge")}
              </span>
              <span className="font-body content-text" style={{ color: "var(--color-text-primary)" }}>
                {t("default.inProgress.text")}
              </span>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{
                  marginLeft: "auto",
                  borderRadius: 6,
                  fontFamily: "var(--font-accent)",
                  fontSize: "var(--text-lg)",
                  letterSpacing: "0.04em",
                  padding: "var(--space-sm) var(--space-lg)",
                  color: "var(--color-bg-page)",
                  background: "var(--color-text-primary)",
                  textDecoration: "none",
                }}
              >
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

          {/* ── THE BRIEF ── */}
          <div>
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
                // The rainbow quote rule — na's "every path open" tell. Painted
                // via border-image so the gradient token can carry the border.
                borderImage: "var(--faction-default-rainbow) 1",
                padding: "var(--space-xl)",
                maxWidth: 660,
              }}
            >
              {task.description && (
                <p
                  className="font-body content-text"
                  style={{
                    lineHeight: 1.8,
                    color: "var(--color-text-secondary)",
                    whiteSpace: "pre-wrap",
                    margin: "0 0 var(--space-lg)",
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

          {/* ── FILED PRAXIS ── */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-md)",
                flexWrap: "wrap",
                marginBottom: "var(--space-lg)",
              }}
            >
              <span
                className="font-display italic"
                style={{ fontSize: "var(--text-title)", color: "var(--color-text-primary)" }}
              >
                {t("default.filedHeading")}
              </span>
              <div style={{ display: "flex", gap: 0 }}>
                {(["score", "recent"] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    className="font-body"
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      padding: "var(--space-xs) var(--space-md)",
                      background:
                        submissionSort === sort ? "var(--color-text-primary)" : "transparent",
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
                  <div style={{ textAlign: "center", marginTop: "var(--space-lg)" }}>
                    <Link
                      to={`/praxes?task_id=${task.id}`}
                      className="font-body"
                      style={{
                        fontSize: "var(--text-base)",
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

          {/* ── PLAYERS IN PROGRESS ── (kept from the pre-redesign page; the
              design's single-column dossier drew no roster, but this is live
              signup data, so it stays as a modest section). */}
          {signups.length > 0 && (
            <div>
              <span
                className="font-display italic"
                style={{
                  display: "inline-block",
                  fontSize: "var(--text-title)",
                  color: "var(--color-text-primary)",
                  marginBottom: "var(--space-md)",
                }}
              >
                {t("default.playersInProgress", { count: signups.length })}
              </span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-lg)",
                  maxWidth: 660,
                }}
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
                        gap: "var(--space-sm)",
                      }}
                    >
                      <Link to={`/characters/${signup.character_id}`}>
                        {signup.avatar_url ? (
                          <img
                            src={mediaUrl(signup.avatar_url)}
                            alt={signup.display_name}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 28,
                              height: 28,
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
                          fontSize: "var(--text-base)",
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          textDecoration: "none",
                        }}
                      >
                        {signup.display_name}
                      </Link>
                      {isFriend && <FeedBadge type="friend" label={t("default.friend")} />}
                      {isFoe && <FeedBadge type="duel" label={t("default.foe")} />}
                    </div>
                  );
                })}
                {signups.length > VISIBLE_SIGNUPS && (
                  <span
                    className="eyebrow"
                    style={{ alignSelf: "center", color: "var(--color-text-tertiary)" }}
                  >
                    {t("default.moreSignups", { count: signups.length - VISIBLE_SIGNUPS })}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
