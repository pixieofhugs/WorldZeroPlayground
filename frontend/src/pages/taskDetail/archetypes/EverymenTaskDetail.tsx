import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { mediaUrl } from "../../../utils/media";
import { ErrorBanner, relationOf } from "./shared";
import type { TaskSignupOut } from "../../../api/tasks";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * The Everymen task-detail archetype — the job rendered as a UNION WORK ORDER:
 * a billboard-scale sunburst poster (cog seal, knockout Bebas headline, status
 * in the union's voice), a stamped CTA bar, a typewritten "The Order" body,
 * the hands signed on, the filed work reports (best-in-hall wears a fleur-de-lis),
 * and a read-only hall verdict. Ported from the Everymen design kit
 * (EverymenTaskDetail.tsx); wired to the real {@link TaskDetailState}.
 *
 * The kit's top <nav> and discussion thread are dropped (TaskDetail.tsx renders
 * the breadcrumb context and CommentThread). Every raw hex from the kit is
 * mapped onto the existing CSS vars in index.css so the surface flips with the
 * theme without mutating the document theme.
 */

const INK = "var(--everymen-ink)";
const CREAM = "var(--everymen-cream)";
const RED = "var(--everymen-red)";
const RED_DEEP = "var(--everymen-red-deep)";
const GOLD = "var(--everymen-gold)";
const OLIVE = "var(--everymen-olive)";
const MUTED = "var(--everymen-muted)";
const PAPER = "var(--everymen-paper)";

/** The Everymen cog seal — a riveted gear, the union's mark. */
function CogSeal({ size = 18 }: { size?: number }) {
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

const sectionRule: CSSProperties = {
  flex: 1,
  height: 3,
  background: `repeating-linear-gradient(90deg, ${RED} 0 16px, ${GOLD} 16px 26px)`,
};
const sectionH2: CSSProperties = {
  fontFamily: "var(--font-accent)",
  fontSize: 26,
  letterSpacing: "0.04em",
  margin: 0,
  color: INK,
  whiteSpace: "nowrap",
};

/** Section header — Bebas heading with the red/gold picket rule. */
function SectionHead({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        marginBottom: 18,
      }}
    >
      <h2 style={sectionH2}>{title}</h2>
      <span style={sectionRule} />
      {trailing}
    </div>
  );
}

/** Hands signed on — real signup avatars with friend/foe dots. */
function HandsRow({
  signups,
  friends,
  foes,
}: {
  signups: TaskSignupOut[];
  friends: Set<number>;
  foes: Set<number>;
}) {
  const { t } = useTranslation("tasks");
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
    >
      {signups.map((hand) => {
        const rel = relationOf(hand.character_id, friends, foes);
        const relColor = rel === "friend" ? OLIVE : RED;
        return (
          <Link
            key={hand.character_id}
            to={`/characters/${hand.character_id}`}
            title={`${hand.display_name}${rel ? ` · ${rel}` : ""}`}
            style={{
              position: "relative",
              width: 40,
              height: 40,
              flexShrink: 0,
            }}
          >
            {hand.avatar_url ? (
              <img
                src={mediaUrl(hand.avatar_url)}
                alt={hand.display_name}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `2px solid ${INK}`,
                }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: INK,
                  border: `2px solid ${GOLD}`,
                  alignItems: "center",
                  justifyContent: "center",
                  color: GOLD,
                  fontFamily: "var(--font-accent)",
                  fontSize: 18,
                }}
              >
                {hand.display_name[0]?.toUpperCase()}
              </span>
            )}
            {rel && (
              <span
                title={rel}
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: relColor,
                  border: `2px solid ${CREAM}`,
                }}
              />
            )}
          </Link>
        );
      })}
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: MUTED,
          marginLeft: 4,
        }}
      >
        {t("everymen.onTheJob")}
      </span>
    </div>
  );
}

export default function EverymenTaskDetail({
  state,
}: {
  state: TaskDetailState;
}) {
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
    topScore,
    voteCount,
    sortedSubmissions,
    submissionSort,
    setSubmissionSort,
    signupError,
    handleSignup,
    handleDrop,
  } = state;

  // Guarded non-null by the dispatcher.
  if (!task) return null;

  // Status in the union's voice: active reads as an open call for hands.
  const statusVoice =
    task.status === "active" ? t("everymen.statusOpen") : task.status;

  // Top-rated work report wears the fleur-de-lis.
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  return (
    <div
      className="py-8"
      style={{ fontFamily: "var(--font-body)", color: INK }}
    >
      {/* ── Breadcrumb ── */}
      <nav
        className="font-body mb-4"
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        <Link to="/tasks" style={{ color: RED, textDecoration: "none" }}>
          {t("everymen.breadcrumb")}
        </Link>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span>{t("everymen.faction")}</span>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span style={{ color: RED }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 920 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {/* ── HERO — union billboard ── */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: `3px solid ${INK}`,
              background: RED,
              color: CREAM,
            }}
          >
            {/* sunburst rays */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.5,
                background: `repeating-conic-gradient(from 0deg at 24% 34%, ${RED_DEEP} 0deg 7deg, transparent 7deg 14deg)`,
              }}
            />
            {/* halftone dot field */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.1,
                backgroundImage: `radial-gradient(${CREAM} 0.6px, transparent 0.7px)`,
                backgroundSize: "5px 5px",
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
                gap: 12,
                flexWrap: "wrap",
                background: INK,
                padding: "9px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: GOLD,
                }}
              >
                <CogSeal size={18} />
                <span
                  style={{
                    fontFamily: "var(--font-accent)",
                    fontSize: 17,
                    letterSpacing: "0.2em",
                  }}
                >
                  {t("everymen.masthead")}
                </span>
              </div>
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: CREAM,
                  border: `1.5px solid ${GOLD}`,
                  padding: "3px 10px",
                }}
              >
                {statusVoice}
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: GOLD,
                position: "relative",
                zIndex: 2,
              }}
            />
            <div
              style={{ position: "relative", zIndex: 2, padding: "30px 34px 32px" }}
            >
              <div
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: 72,
                  lineHeight: 0.9,
                  letterSpacing: "0.01em",
                  color: CREAM,
                  textShadow: `3px 3px 0 ${INK}`,
                  maxWidth: 660,
                  overflowWrap: "anywhere",
                }}
              >
                {task.title}
              </div>
              <div
                style={{
                  height: 3,
                  background: GOLD,
                  width: 120,
                  margin: "20px 0 18px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: INK,
                    color: CREAM,
                    fontFamily: "var(--font-accent)",
                    fontSize: 22,
                    letterSpacing: "0.06em",
                    padding: "6px 16px",
                  }}
                >
                  {t("everymen.levelValue", { level: task.level_required })}
                </span>
                <span
                  style={{
                    background: GOLD,
                    color: INK,
                    fontFamily: "var(--font-accent)",
                    fontSize: 22,
                    letterSpacing: "0.06em",
                    padding: "6px 16px",
                  }}
                >
                  {t("everymen.pointsValue", { points: modifiedPoints })}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    color: CREAM,
                  }}
                >
                  {t("everymen.onView", {
                    signups: signups.length,
                    completed: submissions.length,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* ── CTA bar / signed-on states ── */}
          {canSignUp && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
                border: `1.5px solid ${INK}`,
                background: PAPER,
                padding: "16px 20px",
              }}
            >
              <button
                onClick={handleSignup}
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "14px 26px",
                  border: "none",
                  background: RED,
                  color: CREAM,
                }}
              >
                {t("everymen.signup.cta")}
              </button>
              <div style={{ fontSize: 11, color: MUTED }}>
                {t("everymen.signup.meta", {
                  points: modifiedPoints,
                  open: slotsOpen,
                  max: maxTaskSlots,
                })}
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-accent)",
                  fontSize: 15,
                  letterSpacing: "0.06em",
                  color: RED,
                }}
              >
                {t("everymen.signup.levelRequired", {
                  level: task.level_required,
                })}
              </div>
              <ErrorBanner
                message={signupError}
                style={{
                  flexBasis: "100%",
                  background: "var(--everymen-red-light, rgba(193,39,45,0.08))",
                  border: `1px solid ${RED}`,
                  color: RED_DEEP,
                }}
              />
            </div>
          )}

          {mySubmission && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                border: `1.5px solid ${INK}`,
                background: PAPER,
                padding: "16px 20px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: 18,
                  letterSpacing: "0.08em",
                  color: OLIVE,
                }}
              >
                {t("everymen.submitted.text")}
              </span>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "10px 20px",
                  background: INK,
                  color: CREAM,
                  textDecoration: "none",
                }}
              >
                {t("everymen.submitted.edit")}
              </Link>
            </div>
          )}

          {!mySubmission && isInProgress && inProgressPraxisId !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                border: `1.5px solid ${INK}`,
                background: PAPER,
                padding: "16px 20px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-accent)",
                  fontSize: 18,
                  letterSpacing: "0.08em",
                  color: RED,
                }}
              >
                {t("everymen.inProgress.text")}
              </span>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "10px 20px",
                  background: RED,
                  color: CREAM,
                  textDecoration: "none",
                }}
              >
                {t("everymen.inProgress.continue")}
              </Link>
              <button
                onClick={handleDrop}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                {t("everymen.inProgress.drop")}
              </button>
              <ErrorBanner
                message={signupError}
                style={{
                  flexBasis: "100%",
                  background: "var(--everymen-red-light, rgba(193,39,45,0.08))",
                  border: `1px solid ${RED}`,
                  color: RED_DEEP,
                }}
              />
            </div>
          )}

          {/* ── THE ORDER — the work-order body ── */}
          <section>
            <SectionHead title={t("everymen.orderHeading")} />
            <div
              style={{
                border: `1.5px solid ${INK}`,
                background: PAPER,
                padding: "26px 30px",
                maxWidth: 660,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
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

          {/* ── Hands signed on ── */}
          {signups.length > 0 && (
            <section>
              <SectionHead title={t("everymen.handsHeading")} />
              <HandsRow signups={signups} friends={friends} foes={foes} />
            </section>
          )}

          {/* ── Hall verdict (read-only aggregate) ── */}
          <section>
            <SectionHead title={t("everymen.verdictHeading")} />
            {voteCount > 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--font-accent)",
                    fontSize: 54,
                    lineHeight: 0.8,
                    color: RED,
                  }}
                >
                  {topScore}
                </span>
                <div style={{ paddingBottom: 6 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-accent)",
                      fontSize: 16,
                      letterSpacing: "0.06em",
                      color: INK,
                    }}
                  >
                    {t("everymen.verdict.topMark")}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      color: MUTED,
                    }}
                  >
                    {t("everymen.verdict.reports", { count: voteCount })}
                  </div>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: MUTED,
                }}
              >
                {t("everymen.verdict.none")}
              </p>
            )}
          </section>

          {/* ── Work reports filed (completions) ── */}
          <section>
            <SectionHead
              title={t("everymen.reportsHeading")}
              trailing={
                <div style={{ display: "flex", gap: 0 }}>
                  {(["score", "recent"] as const).map((sort) => {
                    const on = submissionSort === sort;
                    return (
                      <button
                        key={sort}
                        onClick={() => setSubmissionSort(sort)}
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "5px 12px",
                          background: on ? INK : "transparent",
                          color: on ? CREAM : MUTED,
                          border: `1.5px solid ${
                            on
                              ? INK
                              : "color-mix(in srgb, var(--everymen-ink) 30%, transparent)"
                          }`,
                          cursor: "pointer",
                        }}
                      >
                        {sort === "score"
                          ? t("everymen.sort.topRated")
                          : t("everymen.sort.recent")}
                      </button>
                    );
                  })}
                </div>
              }
            />
            {sortedSubmissions.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: MUTED,
                }}
              >
                {t("everymen.empty")}
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "30px 24px",
                    alignItems: "flex-start",
                  }}
                >
                  {sortedSubmissions.slice(0, 4).map((s) => (
                    <div
                      key={s.id}
                      style={{ position: "relative", paddingTop: 20 }}
                    >
                      {s.id === topId && (
                        <div
                          style={{
                            position: "absolute",
                            top: -4,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 3,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            whiteSpace: "nowrap",
                            background: GOLD,
                            color: INK,
                            fontFamily: "var(--font-accent)",
                            fontSize: 13,
                            letterSpacing: "0.1em",
                            padding: "3px 13px",
                            boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
                          }}
                        >
                          <span style={{ fontSize: 13, lineHeight: 1 }}>⚜</span>{" "}
                          {t("everymen.bestInHall")}
                        </div>
                      )}
                      <PraxisCard praxis={s} />
                    </div>
                  ))}
                </div>
                {submissions.length > 4 && (
                  <div style={{ marginTop: 18 }}>
                    <Link
                      to={`/praxes?task_id=${task.id}`}
                      style={{
                        fontFamily: "var(--font-accent)",
                        fontSize: 15,
                        letterSpacing: "0.06em",
                        color: RED,
                        textDecoration: "none",
                      }}
                    >
                      {t("everymen.viewAll", { count: submissions.length })}
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
