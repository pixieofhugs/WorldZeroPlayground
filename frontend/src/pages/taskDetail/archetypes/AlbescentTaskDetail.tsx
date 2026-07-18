import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import AlbescentSigil from "../../../components/cards/AlbescentSigil";
import { mediaUrl } from "../../../utils/media";
import { ErrorBanner, relationOf } from "./shared";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Albescent task-detail archetype — THE CORRESPONDENCE.
 *
 * A task in the Register reads as a letter admitted in confidence: a centred
 * vellum sheet, the surveyor's Mark, Cormorant Garamond italic display, a quiet
 * mono for labels. "The Ask" holds the brief; "Inscribed in the Register" is the
 * wall of returned accounts (the finest is most-witnessed). To take a task is to
 * "Acknowledge" it — no portfolio, no announcement.
 *
 * Albescent is a FIRST-CLASS identity here (not a ua alias): the explicit
 * ARCHETYPE_BY_SLUG['albescent'] entry beats the albescent→ua alias via
 * pickVariant, so this renders immediately. The sheet never dims — Albescent is
 * always-light, so every --faction-albescent-* token reads identically in both
 * themes and we style with them directly. Ported from
 * docs/design/albescent-kit/Albescent Task Detail.dc.html; wired to the real
 * {@link TaskDetailState}. No hardcoded hex (CLAUDE.md).
 */

const FONT = "var(--faction-albescent-card-font)";
const MONO = "var(--faction-albescent-mono)";
const INK = "var(--faction-albescent-card-text)";
const SHEET = "var(--faction-albescent-card-bg)";
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`;

/** Section heading — a serif-italic title flanked by a fading hairline rule. */
function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", marginBottom: "var(--space-lg)" }}>
      <h2
        className="content-title"
        style={{
          fontFamily: FONT,
          fontStyle: "italic",
          fontWeight: 500,
          margin: 0,
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>
      <span style={{ flex: 1, height: 1, background: ink(8) }} />
      {trailing}
    </div>
  );
}

export default function AlbescentTaskDetail({ state }: { state: TaskDetailState }) {
  const { t } = useTranslation("tasks");
  const {
    task,
    signups,
    submissions,
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

  // Decorative: the correspondence's reference number, from the real task id.
  const correspondenceNo = String(task.id).padStart(4, "0");

  // The most-witnessed account on the wall wears the ⚜ mark.
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  return (
    <div
      className="py-8"
      style={{
        fontFamily: MONO,
        color: INK,
        background:
          "radial-gradient(ellipse 72% 58% at 50% 38%, rgba(255,255,255,0.55) 0%, transparent 100%), var(--faction-albescent-page)",
      }}
    >
      {/* Breadcrumb */}
      <nav
        className="mb-4"
        style={{
          fontFamily: MONO,
          fontSize: "var(--text-base)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: ink(40),
        }}
      >
        <Link to="/tasks" style={{ color: "inherit", textDecoration: "none" }}>
          {t("default.breadcrumb")}
        </Link>
        <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>/</span>
        <span>{t("albescent.faction")}</span>
        <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>/</span>
        <span style={{ color: INK }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
          {/* HERO — the letter */}
          <div
            style={{
              background: SHEET,
              border: `1px solid ${ink(10)}`,
              boxShadow: "0 2px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
              // eslint-disable-next-line local/no-raw-style-values -- ornament: letterpress plate margins; the asymmetric 54/60/48 inset is what makes the hero read as a printed sheet rather than a card.
              padding: "54px 60px 48px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-xl)" }}>
              <AlbescentSigil size={44} />
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "var(--text-sm)",
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: ink(45),
                marginBottom: "var(--space-sm)",
              }}
            >
              {t("albescent.faction")}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "var(--text-xs)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: ink(30),
                marginBottom: "var(--space-xl)",
              }}
            >
              {t("albescent.correspondence", { number: correspondenceNo })}
            </div>
            {/* ornament: letterpress hairline rule; its lead sets the plate's vertical rhythm against the title, not a layout gutter. */}
            <div
              style={{
                width: 54,
                height: 1,
                background: ink(12),
                // eslint-disable-next-line local/no-raw-style-values -- ornament, per above
                margin: "0 auto 26px",
              }}
            />
            <h1
              className="content-title"
              style={{
                fontFamily: FONT,
                fontStyle: "italic",
                fontWeight: 500,
                lineHeight: 1.16,
                color: INK,
                margin: "0 auto var(--space-xl)",
                maxWidth: 560,
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h1>
            {/* ornament: letterpress hairline rule; its lead sets the plate's vertical rhythm against the title, not a layout gutter. */}
            <div
              style={{
                width: 54,
                height: 1,
                background: ink(12),
                // eslint-disable-next-line local/no-raw-style-values -- ornament, per above
                margin: "0 auto 28px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-2xl)", flexWrap: "wrap" }}>
              {[
                {
                  label: t("albescent.stats.standing"),
                  value: t("albescent.stats.standingValue", {
                    level: task.level_required,
                  }),
                },
                {
                  label: t("albescent.stats.worth"),
                  value: t("albescent.stats.worthValue", {
                    points: modifiedPoints,
                  }),
                },
                {
                  label: t("albescent.stats.returned"),
                  value: `${submissions.length}`,
                },
              ].map((stat, index) => (
                <div key={stat.label} style={{ display: "flex", gap: "var(--space-2xl)" }}>
                  {index > 0 && <div style={{ borderLeft: `1px solid ${ink(10)}` }} />}
                  <div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: "var(--text-xs)",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: ink(40),
                        marginBottom: "var(--space-sm)",
                      }}
                    >
                      {stat.label}
                    </div>
                    <div className="content-title" style={{ fontFamily: FONT, fontStyle: "italic", color: INK }}>{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA bar — Acknowledge / signed-on states */}
          {canSignUp && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                padding: "var(--space-lg) var(--space-xl)",
              }}
            >
              <button
                onClick={handleSignup}
                style={{
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: "var(--text-sm)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: INK,
                  background: "transparent",
                  border: `1px solid ${INK}`,
                  padding: "var(--space-md) var(--space-xl)",
                }}
              >
                {t("albescent.signup.cta", { points: modifiedPoints })}
              </button>
              <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: "var(--text-xl)", color: ink(55) }}>
                {t("albescent.signup.note")}
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontFamily: MONO,
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: ink(40),
                }}
              >
                {t("albescent.signup.meta", {
                  open: slotsOpen,
                  max: maxTaskSlots,
                  level: task.level_required,
                })}
              </div>
              <ErrorBanner
                message={signupError}
                style={{
                  flexBasis: "100%",
                  marginTop: 0,
                  background: ink(3),
                  border: `1px solid ${ink(14)}`,
                  color: "var(--color-danger)",
                }}
              />
            </div>
          )}

          {mySubmission && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                padding: "var(--space-lg) var(--space-xl)",
              }}
            >
              <span className="content-text" style={{ fontFamily: FONT, fontStyle: "italic", color: ink(65) }}>
                {t("albescent.submitted.text")}
              </span>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: MONO,
                  fontSize: "var(--text-sm)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "var(--space-md) var(--space-xl)",
                  background: INK,
                  color: "var(--faction-albescent-page)",
                  textDecoration: "none",
                }}
              >
                {t("albescent.submitted.edit")}
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
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                padding: "var(--space-lg) var(--space-xl)",
              }}
            >
              <span className="content-text" style={{ fontFamily: FONT, fontStyle: "italic", color: ink(65) }}>
                {t("albescent.inProgress.text")}
              </span>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: MONO,
                  fontSize: "var(--text-sm)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "var(--space-md) var(--space-xl)",
                  background: INK,
                  color: "var(--faction-albescent-page)",
                  textDecoration: "none",
                }}
              >
                {t("albescent.inProgress.continue")}
              </Link>
              <button
                onClick={handleDrop}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: "var(--text-sm)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: ink(40),
                }}
              >
                {t("albescent.inProgress.drop")}
              </button>
              <ErrorBanner
                message={signupError}
                style={{
                  flexBasis: "100%",
                  marginTop: 0,
                  background: ink(3),
                  border: `1px solid ${ink(14)}`,
                  color: "var(--color-danger)",
                }}
              />
            </div>
          )}

          {/* THE ASK — the user-written brief */}
          <section>
            <SectionHead
              title={t("albescent.askHeading")}
              trailing={
                <span style={{ fontFamily: FONT, fontStyle: "italic", fontSize: "var(--text-lg)", color: ink(45), whiteSpace: "nowrap" }}>
                  {t("albescent.askGloss")}
                </span>
              }
            />
            <div
              style={{
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                // eslint-disable-next-line local/no-raw-style-values -- ornament: letterpress plate margins, matching the hero sheet at a smaller cut.
                padding: "34px 40px",
                maxWidth: 640,
              }}
            >
              <p
                className="content-text"
                style={{
                  fontFamily: FONT,
                  lineHeight: 1.62,
                  color: ink(72),
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description || t("albescent.askEmpty")}
              </p>
            </div>
          </section>

          {/* Hands — signups (quiet avatar row) */}
          {signups.length > 0 && (
            <section>
              <SectionHead title={t("albescent.inConfidenceHeading")} />
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
                {signups.map((hand) => {
                  const rel = relationOf(hand.character_id, friends, foes);
                  return (
                    <Link
                      key={hand.character_id}
                      to={`/characters/${hand.character_id}`}
                      title={`${hand.display_name}${rel ? ` · ${rel}` : ""}`}
                      style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}
                    >
                      {hand.avatar_url ? (
                        <img
                          src={mediaUrl(hand.avatar_url)}
                          alt={hand.display_name}
                          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${ink(14)}` }}
                        />
                      ) : (
                        <span
                          style={{
                            display: "flex",
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: ink(4),
                            border: `1px solid ${ink(14)}`,
                            alignItems: "center",
                            justifyContent: "center",
                            color: ink(50),
                            fontFamily: FONT,
                            fontStyle: "italic",
                            fontSize: "var(--text-xl)",
                          }}
                        >
                          {hand.display_name[0]?.toUpperCase()}
                        </span>
                      )}
                    </Link>
                  );
                })}
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "var(--text-sm)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: ink(40),
                    marginLeft: "var(--space-xs)",
                  }}
                >
                  {t("albescent.inHand")}
                </span>
              </div>
            </section>
          )}

          {/* INSCRIBED IN THE REGISTER — returned accounts */}
          <section>
            <SectionHead
              title={t("albescent.registerHeading")}
              trailing={
                <div style={{ display: "flex", gap: 0 }}>
                  {(["score", "recent"] as const).map((sort) => {
                    const on = submissionSort === sort;
                    return (
                      <button
                        key={sort}
                        onClick={() => setSubmissionSort(sort)}
                        style={{
                          fontFamily: MONO,
                          fontSize: "var(--text-sm)",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          padding: "var(--space-xs) var(--space-md)",
                          background: on ? INK : "transparent",
                          color: on ? "var(--faction-albescent-page)" : ink(45),
                          border: `1px solid ${on ? INK : ink(14)}`,
                          cursor: "pointer",
                        }}
                      >
                        {sort === "score"
                          ? t("albescent.sort.mostWitnessed")
                          : t("albescent.sort.recent")}
                      </button>
                    );
                  })}
                </div>
              }
            />
            {sortedSubmissions.length === 0 ? (
              <p className="content-text" style={{ fontFamily: FONT, fontStyle: "italic", color: ink(45) }}>
                {t("albescent.empty")}
              </p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2xl) var(--space-xl)", alignItems: "flex-start" }}>
                  {sortedSubmissions.slice(0, 4).map((s) => (
                    <div key={s.id} style={{ position: "relative", paddingTop: "var(--space-xl)" }}>
                      {s.id === topId && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 3,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "var(--space-sm)",
                            whiteSpace: "nowrap",
                            background: INK,
                            color: "var(--faction-albescent-page)",
                            fontFamily: FONT,
                            fontStyle: "italic",
                            fontSize: "var(--text-lg)",
                            letterSpacing: "0.04em",
                            padding: "var(--space-xs) var(--space-lg)",
                          }}
                        >
                          <span style={{ fontSize: "var(--text-lg)", lineHeight: 1 }}>⚜</span>{" "}
                          {t("albescent.mostWitnessed")}
                        </div>
                      )}
                      <PraxisCard praxis={s} />
                    </div>
                  ))}
                </div>
                {submissions.length > 4 && (
                  <div style={{ marginTop: "var(--space-lg)" }}>
                    <Link
                      to={`/praxes?task_id=${task.id}`}
                      style={{
                        fontFamily: MONO,
                        fontSize: "var(--text-base)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: ink(55),
                        textDecoration: "none",
                        borderBottom: `1px solid ${ink(20)}`,
                        paddingBottom: "var(--space-xs)",
                      }}
                    >
                      {t("albescent.viewAll", { count: submissions.length })}
                    </Link>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
