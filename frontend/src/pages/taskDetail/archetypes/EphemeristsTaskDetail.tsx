import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { mediaUrl } from "../../../utils/media";
import { factionName } from "../../../utils/factions";
import { EphMark, Foxing, LapisLastWord } from "../../../components/cards/ephemeristsAtoms";
import { ErrorBanner, relationOf } from "./shared";
import type { TaskSignupOut } from "../../../api/tasks";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * The Ephemerists task-detail archetype — the job rendered as a DISCORDANT MAP /
 * illuminated codex exhibit: a contested coordinate field on vellum, a Cinzel
 * title with one word pulled to lapis, the commission (brief), sealed
 * ephemerides (completions, the most-canonical wearing a fleur-de-lis), and a
 * read-only credence line in the faction's voice. Ported from the Ephemerists
 * design kit (EphemeristsTaskDetail.tsx); wired to the real
 * {@link TaskDetailState}. Reads only --eph-* / --faction-ephemerists-* tokens.
 *
 * Decorative / not backend-backed (marked inline): the "commission no." (derived
 * from task.id) and the vellum coordinate diagram glyphs.
 */

const INK = "var(--eph-ink)";
const VELLUM_TEXT = "var(--eph-vellum-text)";
const MUTED = "var(--eph-muted)";

/** Section header — a Cinzel label with a gold rule trailing off to nothing. */
function SectionHead({
  title,
  gloss,
}: {
  title: string;
  gloss?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
      <h2
        style={{
          fontFamily: "var(--eph-display)",
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: "0.1em",
          margin: 0,
          color: VELLUM_TEXT,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h2>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "linear-gradient(90deg, var(--eph-gold), transparent)",
        }}
      />
      {gloss && (
        <span
          style={{
            fontFamily: "var(--eph-script)",
            fontStyle: "italic",
            fontSize: 12,
            color: MUTED,
          }}
        >
          {gloss}
        </span>
      )}
    </div>
  );
}

/** The contested coordinate field — a vellum cartographic exhibit with three
 *  irreconcilable readings (cartesian grid, perspective rays, polar rings). */
function DiscordantMap() {
  const { t } = useTranslation("tasks");
  return (
    <div
      style={{
        position: "relative",
        minHeight: 320,
        borderRight: "1px solid var(--eph-gold-deep)",
        overflow: "hidden",
        background: "var(--eph-vellum)",
      }}
    >
      {/* cartesian grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage:
            "repeating-linear-gradient(0deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 18px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 18px)",
        }}
      />
      {/* perspective vanishing rays (lapis) */}
      <svg
        viewBox="0 0 300 320"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.7 }}
        aria-hidden="true"
      >
        <g stroke="var(--eph-lapis)" strokeWidth="0.9" fill="none">
          {[0, 40, 80, 120, 160, 200, 240, 280].map((x) => (
            <line key={x} x1={x} y1="320" x2="185" y2="70" />
          ))}
          {[110, 160, 210, 250].map((y) => (
            <line key={y} x1="0" y1={y} x2="300" y2={y} />
          ))}
        </g>
      </svg>
      {/* polar reading (rubric) */}
      <svg
        viewBox="0 0 300 320"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.72 }}
        aria-hidden="true"
      >
        <g stroke="var(--eph-rubric)" strokeWidth="0.8" fill="none">
          {[28, 58, 92, 128].map((r) => (
            <circle key={r} cx="185" cy="150" r={r} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="185"
              y1="150"
              x2={185 + 130 * Math.cos((i * Math.PI) / 4)}
              y2={150 + 130 * Math.sin((i * Math.PI) / 4)}
            />
          ))}
        </g>
      </svg>
      {/* the contested point — a gold-leaf glimmer */}
      <div
        style={{
          position: "absolute",
          left: "62%",
          top: "47%",
          transform: "translate(-50%,-50%)",
          width: 11,
          height: 11,
          borderRadius: "50%",
          background: "var(--eph-gold-light)",
          boxShadow: "0 0 14px 4px color-mix(in srgb, var(--eph-gold-light) 70%, transparent)",
        }}
      />
      {/* decorative coordinate marginalia — not backend-backed */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "6%",
          fontSize: 9,
          color: VELLUM_TEXT,
          background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)",
          padding: "2px 5px",
        }}
      >
        {t("ephemerists.diagram.coordXPrefix")}<span style={{ textDecoration: "line-through", opacity: 0.65 }}>8</span>{" "}
        <span style={{ color: "var(--eph-lapis)", fontStyle: "italic" }}>9</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: "74%",
          left: "50%",
          fontSize: 9,
          color: "var(--eph-rubric)",
          background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)",
          padding: "2px 5px",
        }}
      >
        {t("ephemerists.diagram.coordPolar")}
      </div>
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "62%",
          fontSize: 9,
          color: "var(--eph-lapis)",
          background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)",
          padding: "2px 5px",
        }}
      >
        {t("ephemerists.diagram.coordVanishing")}
      </div>
      <div
        style={{
          position: "absolute",
          left: 4,
          bottom: 8,
          transformOrigin: "left bottom",
          transform: "rotate(-90deg)",
          whiteSpace: "nowrap",
          fontSize: 7.5,
          color: MUTED,
          opacity: 0.85,
        }}
      >
        {t("ephemerists.diagram.widthNote")}
      </div>
    </div>
  );
}

/** Marginalia of cartographers — real signup avatars on the vellum margin,
 *  each linking to its character, friend/foe noted in the surveyor's voice. */
function SurveyorRow({
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
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {signups.map((m) => {
        const rel = relationOf(m.character_id, friends, foes);
        const relColor = rel === "friend" ? "var(--eph-lapis)" : "var(--eph-rubric)";
        return (
          <Link
            key={m.character_id}
            to={`/characters/${m.character_id}`}
            title={`${m.display_name}${rel ? ` · ${rel}` : ""}`}
            style={{
              position: "relative",
              width: 38,
              height: 38,
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            {m.avatar_url ? (
              <img
                src={mediaUrl(m.avatar_url)}
                alt={m.display_name}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1.5px solid var(--eph-gold-deep)",
                }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--eph-vellum-deep)",
                  border: "1.5px solid var(--eph-gold-deep)",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--eph-rubric)",
                  fontFamily: "var(--eph-display)",
                  fontSize: 15,
                }}
              >
                {m.display_name[0]?.toUpperCase()}
              </span>
            )}
            {rel && (
              <span
                title={rel}
                style={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: relColor,
                  border: "1.5px solid var(--eph-vellum)",
                }}
              />
            )}
          </Link>
        );
      })}
      <span
        style={{
          fontFamily: "var(--eph-script)",
          fontStyle: "italic",
          fontSize: 13,
          color: MUTED,
          marginLeft: 4,
        }}
      >
        {t("ephemerists.triangulating")}
      </span>
    </div>
  );
}

export default function EphemeristsTaskDetail({
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

  // Decorative: the Ephemerists letter a "commission no." — derive from real id.
  const commissionNo = `C-${task.id}`;
  const isMeta = task.task_type === "metatask";
  // The faction's voice: an active task is an OPEN commission; else honest status.
  const statusLabel =
    task.status === "active" ? t("ephemerists.statusOpen") : task.status;
  // Top-rated ephemeris (most canonical) by real score.
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  return (
    <div
      className="py-8"
      style={{ fontFamily: "var(--eph-serif)", color: VELLUM_TEXT }}
    >
      {/* ── Breadcrumb ── */}
      <nav
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: MUTED,
          fontFamily: "var(--eph-display)",
          marginBottom: 22,
        }}
      >
        <Link
          to="/tasks"
          style={{ color: "var(--faction-ephemerists)", textDecoration: "none" }}
        >
          {t("ephemerists.breadcrumb")}
        </Link>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span>{t("ephemerists.faction")}</span>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span style={{ color: "var(--eph-rubric)" }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 920, display: "flex", flexDirection: "column", gap: 30 }}>
        {/* ── Hero — the discordant exhibit ── */}
        <div
          style={{
            position: "relative",
            background: "var(--eph-vellum)",
            border: "1.5px solid var(--eph-ink)",
            boxShadow: "0 14px 34px rgba(42,29,18,0.18)",
            overflow: "hidden",
          }}
        >
          <Foxing opacity={0.35} />
          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "grid",
              gridTemplateColumns: "300px 1fr",
            }}
          >
            <DiscordantMap />
            <div
              style={{
                padding: "30px 34px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  color: "var(--eph-gold)",
                  marginBottom: 6,
                }}
              >
                <EphMark size={13} color="var(--eph-gold)" />
                <span
                  style={{
                    fontFamily: "var(--eph-display)",
                    fontWeight: 600,
                    fontSize: 9,
                    letterSpacing: "0.24em",
                  }}
                >
                  {t("ephemerists.masthead")}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--eph-script)",
                  fontStyle: "italic",
                  fontSize: 12,
                  color: MUTED,
                  marginBottom: 16,
                }}
              >
                {t("ephemerists.statusLine", {
                  status: statusLabel,
                  number: commissionNo,
                })}
              </div>
              {isMeta && (
                <div
                  style={{
                    fontFamily: "var(--eph-display)",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--eph-rubric)",
                    marginBottom: 10,
                  }}
                >
                  {t("ephemerists.metataskFor", {
                    faction: factionName(task.metatask_faction_slug),
                  })}
                </div>
              )}
              <h1
                style={{
                  fontFamily: "var(--eph-display)",
                  fontWeight: 700,
                  fontSize: 38,
                  lineHeight: 1.04,
                  color: VELLUM_TEXT,
                  margin: "0 0 14px",
                  overflowWrap: "anywhere",
                }}
              >
                <LapisLastWord text={task.title} footnote />
              </h1>
              <div
                style={{
                  height: 1,
                  background: "linear-gradient(90deg, var(--eph-gold), transparent)",
                  marginBottom: 16,
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--eph-display)",
                    fontSize: 12,
                    color: VELLUM_TEXT,
                  }}
                >
                  {t("ephemerists.grade", { level: task.level_required })}
                </span>
                <span
                  style={{
                    fontFamily: "var(--eph-display)",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "var(--eph-rubric)",
                  }}
                >
                  {modifiedPoints}{" "}
                  <span style={{ fontSize: 11, letterSpacing: "0.06em" }}>
                    {t("ephemerists.puncta")}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "var(--eph-script)",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: MUTED,
                  }}
                >
                  {t("ephemerists.onView", {
                    signups: signups.length,
                    completed: submissions.length,
                  })}
                </span>
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontStyle: "italic",
                  color: MUTED,
                  marginTop: 14,
                  lineHeight: 1.4,
                }}
              >
                <Trans
                  t={t}
                  i18nKey="ephemerists.footnote"
                  components={[
                    <span key="0" style={{ color: "var(--eph-lapis)" }} />,
                  ]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── The Commission (brief) ── */}
        <section>
          <SectionHead title={t("ephemerists.commissionHeading")} />
          <div
            className="font-body"
            style={{
              position: "relative",
              border: "1px solid var(--eph-gold-deep)",
              background: "var(--eph-vellum)",
              padding: "28px 32px",
              maxWidth: 660,
              fontFamily: "var(--eph-serif)",
              fontSize: 17,
              lineHeight: 1.7,
              color: VELLUM_TEXT,
              whiteSpace: "pre-wrap",
            }}
          >
            <Foxing opacity={0.3} />
            <span style={{ position: "relative", zIndex: 2 }}>
              {task.description || t("ephemerists.commissionEmpty")}
            </span>
          </div>
        </section>

        {/* ── Signup CTA — only when the viewer may enroll ── */}
        {canSignUp && (
          <section
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
              border: "1px solid var(--eph-ink)",
              background: "var(--eph-vellum)",
              padding: "16px 20px",
            }}
          >
            <button
              onClick={handleSignup}
              style={{
                cursor: "pointer",
                fontFamily: "var(--eph-serif)",
                fontStyle: "italic",
                fontSize: 15,
                letterSpacing: "0.06em",
                color: "var(--eph-parchment)",
                background: "var(--eph-ink)",
                border: "none",
                padding: "13px 26px",
              }}
            >
              {t("ephemerists.signup.cta", { points: modifiedPoints })}
            </button>
            <div
              style={{
                fontFamily: "var(--eph-script)",
                fontStyle: "italic",
                fontSize: 14,
                color: MUTED,
              }}
            >
              {t("ephemerists.signup.note")}
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontFamily: "var(--eph-display)",
                fontSize: 9,
                letterSpacing: "0.1em",
                color: "var(--eph-gold-deep)",
                textTransform: "uppercase",
              }}
            >
              {t("ephemerists.signup.meta", {
                open: slotsOpen,
                max: maxTaskSlots,
                level: task.level_required,
              })}
            </div>
          </section>
        )}
        {canSignUp && (
          <ErrorBanner
            message={signupError}
            style={{
              background: "color-mix(in srgb, var(--eph-rubric) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--eph-rubric) 30%, transparent)",
              color: "var(--eph-rubric)",
            }}
          />
        )}

        {/* ── My enrolment states ── */}
        {mySubmission && (
          <section
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              border: "1px solid var(--eph-gold-deep)",
              background: "var(--eph-vellum)",
              padding: "14px 20px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--eph-script)",
                fontStyle: "italic",
                fontSize: 14,
                color: VELLUM_TEXT,
              }}
            >
              {t("ephemerists.submitted.text")}
            </span>
            <Link
              to={`/praxes/${mySubmission.id}/edit`}
              style={{
                fontFamily: "var(--eph-display)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--eph-parchment)",
                background: "var(--eph-lapis)",
                padding: "9px 18px",
                textDecoration: "none",
              }}
            >
              {t("ephemerists.submitted.edit")}
            </Link>
          </section>
        )}

        {!mySubmission && isInProgress && inProgressPraxisId !== null && (
          <section
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              border: "1px solid var(--eph-gold-deep)",
              background: "var(--eph-vellum)",
              padding: "14px 20px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--eph-script)",
                fontStyle: "italic",
                fontSize: 14,
                color: VELLUM_TEXT,
              }}
            >
              {t("ephemerists.inProgress.text")}
            </span>
            <Link
              to={`/praxes/${inProgressPraxisId}/edit`}
              style={{
                fontFamily: "var(--eph-display)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--eph-parchment)",
                background: "var(--eph-ink)",
                padding: "9px 18px",
                textDecoration: "none",
              }}
            >
              {t("ephemerists.inProgress.continue")}
            </Link>
            <button
              onClick={handleDrop}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--eph-script)",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--eph-rubric)",
              }}
            >
              {t("ephemerists.inProgress.drop")}
            </button>
          </section>
        )}

        {/* ── Marginalia of cartographers (signups) ── */}
        {signups.length > 0 && (
          <section>
            <SectionHead
              title={t("ephemerists.cartographersHeading")}
              gloss={t("ephemerists.cartographersGloss", {
                count: signups.length,
              })}
            />
            <SurveyorRow signups={signups} friends={friends} foes={foes} />
          </section>
        )}

        {/* ── Credence (read-only vote aggregate) ── */}
        <section>
          <SectionHead title={t("ephemerists.credenceHeading")} />
          {voteCount > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <span
                style={{
                  fontFamily: "var(--eph-display)",
                  fontWeight: 700,
                  fontSize: 54,
                  lineHeight: 0.8,
                  color: "var(--eph-rubric)",
                }}
              >
                {topScore}
              </span>
              <div style={{ paddingBottom: 6 }}>
                <div
                  style={{
                    fontFamily: "var(--eph-display)",
                    fontSize: 14,
                    letterSpacing: "0.06em",
                    color: VELLUM_TEXT,
                  }}
                >
                  {t("ephemerists.credence.highest")}
                </div>
                <div
                  style={{
                    fontFamily: "var(--eph-script)",
                    fontStyle: "italic",
                    fontSize: 13,
                    color: MUTED,
                  }}
                >
                  {t("ephemerists.credence.weighed", { count: voteCount })}
                </div>
              </div>
            </div>
          ) : (
            <p
              style={{
                fontFamily: "var(--eph-script)",
                fontStyle: "italic",
                fontSize: 15,
                color: MUTED,
                margin: 0,
              }}
            >
              {t("ephemerists.credence.none")}
            </p>
          )}
        </section>

        {/* ── Sealed Ephemerides (completed praxis) ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <SectionHead
              title={t("ephemerists.ephemeridesHeading")}
              gloss={t("ephemerists.ephemeridesGloss", {
                count: submissions.length,
              })}
            />
            <div style={{ display: "flex", gap: 0 }}>
              {(["score", "recent"] as const).map((sort) => {
                const on = submissionSort === sort;
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: "var(--eph-display)",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "5px 12px",
                      background: on ? "var(--eph-ink)" : "transparent",
                      color: on ? "var(--eph-gold-light)" : MUTED,
                      border: `1px solid ${on ? "var(--eph-ink)" : "var(--eph-gold-deep)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {sort === "score"
                      ? t("ephemerists.sort.mostCanonical")
                      : t("ephemerists.sort.recent")}
                  </button>
                );
              })}
            </div>
          </div>

          {sortedSubmissions.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--eph-script)",
                fontStyle: "italic",
                fontSize: 15,
                color: MUTED,
                margin: 0,
              }}
            >
              {t("ephemerists.empty")}
            </p>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "30px 24px", alignItems: "flex-start" }}>
                {sortedSubmissions.slice(0, 4).map((s) => (
                  <div key={s.id} style={{ position: "relative", paddingTop: s.id === topId ? 22 : 0 }}>
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
                          gap: 5,
                          whiteSpace: "nowrap",
                          background: INK,
                          color: "var(--eph-gold-light)",
                          fontFamily: "var(--eph-display)",
                          fontSize: 8,
                          letterSpacing: "0.14em",
                          padding: "4px 12px",
                          boxShadow: "0 3px 8px rgba(42,29,18,0.35)",
                        }}
                      >
                        <span style={{ fontSize: 12, lineHeight: 1, color: "var(--eph-gold-light)" }}>⚜</span>{" "}
                        {t("ephemerists.mostCanonical")}
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
                    style={{
                      fontFamily: "var(--eph-script)",
                      fontStyle: "italic",
                      fontSize: 15,
                      color: "var(--eph-rubric)",
                      textDecoration: "none",
                      borderBottom: "1px solid color-mix(in srgb, var(--eph-rubric) 40%, transparent)",
                    }}
                  >
                    {t("ephemerists.viewAll", { count: submissions.length })}
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
