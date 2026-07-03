import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import PraxisCard from "../../../components/PraxisCard";
import AlbescentMark from "../../../components/cards/AlbescentMark";
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
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
      <h2
        style={{
          fontFamily: FONT,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 22,
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
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: ink(40),
        }}
      >
        <Link to="/tasks" style={{ color: "inherit", textDecoration: "none" }}>
          Tasks
        </Link>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>/</span>
        <span>Albescent</span>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>/</span>
        <span style={{ color: INK }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          {/* HERO — the letter */}
          <div
            style={{
              background: SHEET,
              border: `1px solid ${ink(10)}`,
              boxShadow: "0 2px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
              padding: "54px 60px 48px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <AlbescentMark size={44} />
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: ink(45),
                marginBottom: 6,
              }}
            >
              Albescent
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 8,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: ink(30),
                marginBottom: 26,
              }}
            >
              Correspondence №{correspondenceNo} · in confidence
            </div>
            <div style={{ width: 54, height: 1, background: ink(12), margin: "0 auto 26px" }} />
            <h1
              style={{
                fontFamily: FONT,
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: 46,
                lineHeight: 1.16,
                color: INK,
                margin: "0 auto 22px",
                maxWidth: 560,
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </h1>
            <div style={{ width: 54, height: 1, background: ink(12), margin: "0 auto 28px" }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
              {[
                { label: "Standing", value: `Lvl ${task.level_required}` },
                { label: "Worth", value: `${modifiedPoints} pts` },
                { label: "Returned", value: `${submissions.length}` },
              ].map((stat, index) => (
                <div key={stat.label} style={{ display: "flex", gap: 48 }}>
                  {index > 0 && <div style={{ borderLeft: `1px solid ${ink(10)}` }} />}
                  <div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 8,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: ink(40),
                        marginBottom: 6,
                      }}
                    >
                      {stat.label}
                    </div>
                    <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 22, color: INK }}>{stat.value}</div>
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
                gap: 18,
                flexWrap: "wrap",
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                padding: "16px 22px",
              }}
            >
              <button
                onClick={handleSignup}
                style={{
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: INK,
                  background: "transparent",
                  border: `1px solid ${INK}`,
                  padding: "13px 26px",
                }}
              >
                Acknowledge · earn up to {modifiedPoints} pts
              </button>
              <div style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 15, color: ink(55) }}>
                no portfolio. no announcement.
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontFamily: MONO,
                  fontSize: 8,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: ink(40),
                }}
              >
                {slotsOpen} of {maxTaskSlots} slots open · Lvl {task.level_required} standing met
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
                gap: 16,
                flexWrap: "wrap",
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                padding: "16px 22px",
              }}
            >
              <span style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 17, color: ink(65) }}>
                ⚜ Your account is inscribed in the Register
              </span>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "10px 20px",
                  background: INK,
                  color: "var(--faction-albescent-page)",
                  textDecoration: "none",
                }}
              >
                edit
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
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                padding: "16px 22px",
              }}
            >
              <span style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 17, color: ink(65) }}>
                Your account is unfiled, still in hand
              </span>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "10px 20px",
                  background: INK,
                  color: "var(--faction-albescent-page)",
                  textDecoration: "none",
                }}
              >
                continue
              </Link>
              <button
                onClick={handleDrop}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: ink(40),
                }}
              >
                withdraw
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
              title="The Ask"
              trailing={
                <span style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 13, color: ink(45), whiteSpace: "nowrap" }}>
                  in the hand of the keeper
                </span>
              }
            />
            <div
              style={{
                background: SHEET,
                border: `1px solid ${ink(10)}`,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                padding: "34px 40px",
                maxWidth: 640,
              }}
            >
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 20,
                  lineHeight: 1.62,
                  color: ink(72),
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description ||
                  "No correspondence entered yet. The Register waits for the ask to be set down — plainly, in the fewest words that keep it true."}
              </p>
            </div>
          </section>

          {/* Hands — signups (quiet avatar row) */}
          {signups.length > 0 && (
            <section>
              <SectionHead title="Taken in Confidence" />
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                            fontSize: 16,
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
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: ink(40),
                    marginLeft: 4,
                  }}
                >
                  in hand
                </span>
              </div>
            </section>
          )}

          {/* INSCRIBED IN THE REGISTER — returned accounts */}
          <section>
            <SectionHead
              title="Inscribed in the Register"
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
                          fontSize: 9,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          padding: "5px 12px",
                          background: on ? INK : "transparent",
                          color: on ? "var(--faction-albescent-page)" : ink(45),
                          border: `1px solid ${on ? INK : ink(14)}`,
                          cursor: "pointer",
                        }}
                      >
                        {sort === "score" ? "most witnessed" : "recent"}
                      </button>
                    );
                  })}
                </div>
              }
            />
            {sortedSubmissions.length === 0 ? (
              <p style={{ fontFamily: FONT, fontStyle: "italic", fontSize: 16, color: ink(45) }}>
                The Register holds no accounts against this correspondence. Be the first to return one, unsigned.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "30px 24px", alignItems: "flex-start" }}>
                  {sortedSubmissions.slice(0, 4).map((s) => (
                    <div key={s.id} style={{ position: "relative", paddingTop: 22 }}>
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
                            gap: 6,
                            whiteSpace: "nowrap",
                            background: INK,
                            color: "var(--faction-albescent-page)",
                            fontFamily: FONT,
                            fontStyle: "italic",
                            fontSize: 13,
                            letterSpacing: "0.04em",
                            padding: "3px 14px",
                          }}
                        >
                          <span style={{ fontSize: 13, lineHeight: 1 }}>⚜</span> most witnessed
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
                        fontFamily: MONO,
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: ink(55),
                        textDecoration: "none",
                        borderBottom: `1px solid ${ink(20)}`,
                        paddingBottom: 2,
                      }}
                    >
                      all {submissions.length} accounts &rarr;
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
