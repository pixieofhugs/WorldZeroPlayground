import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { mediaUrl } from "../../../utils/media";
import { ErrorBanner, LevelJumpBanner, relationOf } from "./shared";
import type { TaskSignupOut } from "../../../api/tasks";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Singularity task-detail archetype — the job rendered as a TERMINAL PRINTOUT:
 * a phosphor-on-black protocol readout with boot lines, scanlines, circuit
 * corners, sealed-praxis logs (highest signal wears a fleur-de-lis), and a
 * "JOIN ARRAY" sign-up CTA. Ported from the Singularity design kit
 * (SingularityTaskDetail.tsx); wired to the real {@link TaskDetailState}.
 *
 * ALWAYS-DARK without theme mutation: the kit forced `data-theme="dark"` on the
 * document on mount. That effect is dropped entirely. The `--faction-singularity-*`
 * card tokens hold identical terminal-black/green values in BOTH themes, so the
 * archetype styles its own container with those tokens and reads as a terminal
 * regardless of the global theme.
 */

// Terminal-fixed tokens (identical in light + dark).
const BLACK = "var(--faction-singularity-card-bg)"; // terminal black
const GREEN = "var(--faction-singularity-card-text)"; // phosphor green
const BLUE = "var(--faction-singularity-card-muted)"; // blue chrome
const HARD = "var(--faction-singularity-border-hard)"; // hard blue border
const TERM_FONT = "var(--font-faction-terminal)"; // Share Tech Mono

// Shades derived from tokens (never raw hex; rgba black/white allowed for overlays).
const RULE = "color-mix(in srgb, var(--faction-singularity-border-hard) 30%, transparent)";
const PANEL_BORDER = "color-mix(in srgb, var(--faction-singularity-border-hard) 55%, transparent)";
const PANEL_BG = "color-mix(in srgb, var(--faction-singularity-border-hard) 8%, transparent)";
const BODY_BORDER = "color-mix(in srgb, var(--faction-singularity-border-hard) 25%, transparent)";
const BODY_BG = "color-mix(in srgb, var(--faction-singularity-border-hard) 4%, transparent)";
const BLUE_FAINT = "color-mix(in srgb, var(--faction-singularity-card-muted) 50%, transparent)";
const BLUE_DIM = "color-mix(in srgb, var(--faction-singularity-card-muted) 45%, transparent)";
const GREEN_DIM = "color-mix(in srgb, var(--faction-singularity-card-text) 55%, transparent)";
const GREEN_SOFT = "color-mix(in srgb, var(--faction-singularity-card-text) 60%, transparent)";

const sectionRule: CSSProperties = { flex: 1, height: 1, background: RULE };
const sectionH2: CSSProperties = {
  fontSize: "var(--text-xs)",
  letterSpacing: "0.28em",
  margin: 0,
  color: GREEN_SOFT,
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  fontFamily: TERM_FONT,
};
const statBox: CSSProperties = {
  border: `1px solid ${PANEL_BORDER}`,
  background: PANEL_BG,
  padding: "var(--space-md) var(--space-lg)",
  textAlign: "center",
  minWidth: 90,
};
const statLabel: CSSProperties = {
  fontSize: "var(--text-xs)",
  letterSpacing: "0.2em",
  color: BLUE_FAINT,
  textTransform: "uppercase",
  marginTop: "var(--space-xs)",
};

/** A single circuit-trace corner SVG (token-stroked). */
function CircuitCorner({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="160"
      height="110"
      viewBox="0 0 160 110"
      style={{
        position: "absolute",
        ...(flip ? { bottom: 0, right: 0, transform: "rotate(180deg)" } : { top: 0, left: 0 }),
        opacity: 0.6,
      }}
      fill="none"
      stroke={HARD}
      strokeWidth="1"
    >
      <path d="M0 28 H40 V8 H92" />
      <path d="M0 56 H60 V40 H120" />
      <circle cx="92" cy="8" r="2.5" fill={GREEN} stroke="none" />
      <circle cx="120" cy="40" r="2.5" fill={GREEN} stroke="none" />
    </svg>
  );
}

/** Array roster — real signup avatars with friend/foe markers. */
function ArrayRoster({
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
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}>
      {signups.map((member) => {
        const rel = relationOf(member.character_id, friends, foes);
        const relColor = rel === "friend" ? GREEN : BLUE;
        return (
          <Link
            key={member.character_id}
            to={`/characters/${member.character_id}`}
            title={`${member.display_name}${rel ? ` · ${rel}` : ""}`}
            style={{ position: "relative", width: 34, height: 34, flexShrink: 0 }}
          >
            {member.avatar_url ? (
              <img
                src={mediaUrl(member.avatar_url)}
                alt={member.display_name}
                style={{
                  width: 34,
                  height: 34,
                  objectFit: "cover",
                  border: `1px solid ${PANEL_BORDER}`,
                }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  width: 34,
                  height: 34,
                  background: BLACK,
                  border: `1px solid ${PANEL_BORDER}`,
                  alignItems: "center",
                  justifyContent: "center",
                  color: GREEN,
                  fontFamily: TERM_FONT,
                  fontSize: "var(--text-lg)",
                }}
              >
                {member.display_name[0]?.toUpperCase()}
              </span>
            )}
            {rel && (
              <span
                title={rel}
                style={{
                  position: "absolute",
                  right: -3,
                  bottom: -3,
                  width: 10,
                  height: 10,
                  background: relColor,
                  border: `1.5px solid ${BLACK}`,
                }}
              />
            )}
          </Link>
        );
      })}
      <span
        style={{
          fontFamily: TERM_FONT,
          fontSize: "var(--text-xs)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: BLUE_DIM,
          marginLeft: "var(--space-sm)",
        }}
      >
        {t("singularity.nodesOnArray")}
      </span>
    </div>
  );
}

export default function SingularityTaskDetail({
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

  // Terminal-voiced status: an active job is a RUNNING/OPEN protocol; else the real status.
  const statusVoice =
    task.status === "active"
      ? t("singularity.statusOpen")
      : task.status.toUpperCase();
  const consensusVoice =
    task.status === "active"
      ? t("singularity.consensusOpen")
      : task.status.toUpperCase();
  // Highest-signal log wears the fleur-de-lis.
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  return (
    <div
      className="py-8"
      style={{
        fontFamily: TERM_FONT,
        color: GREEN,
        position: "relative",
        background: BLACK,
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.022) 2px, rgba(74,222,128,0.022) 4px), radial-gradient(80% 60% at 50% 0%, rgba(37,99,235,0.10), transparent 70%)",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 var(--space-xl)" }}>
        {/* ── Breadcrumb ── */}
        <nav
          className="font-body"
          style={{
            fontSize: "var(--text-sm)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: BLUE_FAINT,
            marginBottom: "var(--space-xl)",
          }}
        >
          <Link to="/tasks" style={{ color: BLUE, textDecoration: "none" }}>
            {t("default.breadcrumb")}
          </Link>
          <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>/</span>
          <span>{t("singularity.faction")}</span>
          <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>/</span>
          <span style={{ color: GREEN }}>{task.title}</span>
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
          {/* ── Hero — terminal protocol readout ── */}
          <div
            style={{
              position: "relative",
              border: `1px solid ${PANEL_BORDER}`,
              background: BLACK,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 6,
                border: `1px solid color-mix(in srgb, var(--faction-singularity-border-hard) 12%, transparent)`,
                pointerEvents: "none",
              }}
            />
            <CircuitCorner />
            <CircuitCorner flip />
            <div style={{ position: "relative", zIndex: 2, padding: "var(--space-2xl) var(--space-2xl) var(--space-2xl)" }}>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.16em",
                  color: BLUE_FAINT,
                  lineHeight: 2,
                  marginBottom: "var(--space-lg)",
                }}
              >
                <div>
                  {t("singularity.protocol", {
                    number: String(task.id).padStart(4, "0"),
                  })}
                </div>
                <div>
                  {t("singularity.class", {
                    level: task.level_required,
                    points: modifiedPoints,
                  })}
                </div>
                <div>
                  {t("singularity.statusLine", { status: statusVoice })}{" "}
                  &nbsp;·&nbsp; {t("singularity.consensusLine")}{" "}
                  <span style={{ color: GREEN }}>{consensusVoice}</span>
                </div>
              </div>
              <h1
                className="content-title"
                style={{
                  lineHeight: 1.0,
                  letterSpacing: "0.03em",
                  color: GREEN,
                  margin: "0 0 var(--space-xl)",
                  overflowWrap: "anywhere",
                }}
              >
                {task.title}
                <span
                  aria-hidden
                  className="sg-cursor"
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 34,
                    background: GREEN,
                    marginLeft: "var(--space-sm)",
                    verticalAlign: -4,
                  }}
                />
              </h1>
              <div style={{ display: "flex", gap: "var(--space-lg)", flexWrap: "wrap" }}>
                <div style={statBox}>
                  <div className="content-title" style={{ lineHeight: 1, color: GREEN }}>
                    {modifiedPoints}
                  </div>
                  <div style={statLabel}>{t("singularity.stats.credits")}</div>
                </div>
                <div style={statBox}>
                  <div className="content-title" style={{ lineHeight: 1, color: GREEN }}>
                    {task.level_required}
                  </div>
                  <div style={statLabel}>{t("singularity.stats.level")}</div>
                </div>
                <div style={statBox}>
                  <div className="content-title" style={{ lineHeight: 1, color: BLUE }}>
                    {signups.length}
                  </div>
                  <div style={statLabel}>{t("singularity.stats.arrays")}</div>
                </div>
                <div style={statBox}>
                  <div className="content-title" style={{ lineHeight: 1, color: GREEN }}>
                    {submissions.length}
                  </div>
                  <div style={statLabel}>{t("singularity.stats.sealed")}</div>
                </div>
              </div>
            </div>
            <svg
              viewBox="0 0 1160 30"
              preserveAspectRatio="none"
              style={{ display: "block", width: "100%", height: 30, opacity: 0.4 }}
              stroke={GREEN}
              strokeWidth="1"
              fill="none"
            >
              <path d="M0 15 H120 L132 4 L144 26 L156 9 L168 21 L180 15 H320 L332 7 L344 23 L356 15 H520 L532 2 L544 28 L556 12 L568 18 L580 15 H760 L772 6 L784 24 L796 15 H980 L992 9 L1004 21 L1016 15 H1160" />
            </svg>
          </div>

          {/* ── The observation (task body) ── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", marginBottom: "var(--space-lg)" }}>
              <h2 style={sectionH2}>{t("singularity.observationHeading")}</h2>
              <span style={sectionRule} />
            </div>
            <div
              style={{
                border: `1px solid ${BODY_BORDER}`,
                background: BODY_BG,
                padding: "var(--space-xl) var(--space-2xl)",
                maxWidth: 660,
              }}
            >
              <p
                className="content-text"
                style={{
                  fontFamily: TERM_FONT,
                  lineHeight: 1.9,
                  color: GREEN_DIM,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description || t("singularity.observationEmpty")}
              </p>
            </div>
          </section>

          {/* ── CTA bar / signed-up states ── */}
          <LevelJumpBanner state={state} />
          {canSignUp && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                border: `1px solid ${PANEL_BORDER}`,
                background: PANEL_BG,
                padding: "var(--space-lg) var(--space-xl)",
              }}
            >
              <button
                onClick={handleSignup}
                style={{
                  cursor: "pointer",
                  fontFamily: TERM_FONT,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: BLUE,
                  background: PANEL_BG,
                  border: `1px solid ${BLUE}`,
                  padding: "var(--space-md) var(--space-xl)",
                }}
              >
                {t("singularity.signup.cta", { points: modifiedPoints })}
              </button>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.06em",
                  color: GREEN_DIM,
                  fontStyle: "italic",
                }}
              >
                {t("singularity.signup.note", {
                  open: slotsOpen,
                  max: maxTaskSlots,
                })}
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.14em",
                  color: BLUE_DIM,
                }}
              >
                {t("singularity.signup.levelRequired", {
                  level: task.level_required,
                })}
              </div>
            </div>
          )}

          {mySubmission && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                border: `1px solid ${PANEL_BORDER}`,
                background: PANEL_BG,
                padding: "var(--space-lg) var(--space-xl)",
              }}
            >
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                style={{
                  fontFamily: TERM_FONT,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: GREEN,
                  background: "color-mix(in srgb, var(--faction-singularity-card-text) 14%, transparent)",
                  border: `1px solid ${GREEN}`,
                  padding: "var(--space-md) var(--space-xl)",
                  textDecoration: "none",
                }}
              >
                {t("singularity.submitted.edit")}
              </Link>
              <div style={{ fontSize: "var(--text-xs)", letterSpacing: "0.06em", color: GREEN_DIM, fontStyle: "italic" }}>
                {t("singularity.submitted.note")}
              </div>
            </div>
          )}

          {!mySubmission && isInProgress && inProgressPraxisId !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                border: `1px solid ${PANEL_BORDER}`,
                background: PANEL_BG,
                padding: "var(--space-lg) var(--space-xl)",
              }}
            >
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{
                  fontFamily: TERM_FONT,
                  fontSize: "var(--text-md)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: GREEN,
                  background: "color-mix(in srgb, var(--faction-singularity-card-text) 14%, transparent)",
                  border: `1px solid ${GREEN}`,
                  padding: "var(--space-md) var(--space-xl)",
                  textDecoration: "none",
                }}
              >
                {t("singularity.inProgress.continue")}
              </Link>
              <button
                onClick={handleDrop}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: TERM_FONT,
                  fontSize: "var(--text-sm)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: BLUE_DIM,
                }}
              >
                {t("singularity.inProgress.drop")}
              </button>
            </div>
          )}

          <ErrorBanner
            message={signupError}
            style={{
              background: "rgba(37,99,235,0.08)",
              border: `1px solid ${PANEL_BORDER}`,
              color: GREEN,
            }}
          />

          {/* ── Array roster (signups) ── */}
          {signups.length > 0 && (
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", marginBottom: "var(--space-lg)" }}>
                <h2 style={sectionH2}>{t("singularity.rosterHeading")}</h2>
                <span style={sectionRule} />
                <span style={{ fontSize: "var(--text-xs)", letterSpacing: "0.12em", color: BLUE_DIM }}>
                  {t("singularity.rosterSynced", { count: signups.length })}
                </span>
              </div>
              <ArrayRoster signups={signups} friends={friends} foes={foes} />
            </section>
          )}

          {/* ── Mob verdict (read-only vote aggregate) ── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-lg)", marginBottom: "var(--space-lg)" }}>
              <h2 style={sectionH2}>{t("singularity.consensusHeading")}</h2>
              <span style={sectionRule} />
            </div>
            {voteCount > 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)" }}>
                <span className="content-title" style={{ fontFamily: TERM_FONT, lineHeight: 0.8, color: GREEN }}>
                  {topScore}
                </span>
                <div style={{ paddingBottom: "var(--space-xs)" }}>
                  <div
                    style={{
                      fontFamily: TERM_FONT,
                      fontSize: "var(--text-lg)",
                      letterSpacing: "0.1em",
                      color: BLUE,
                      textTransform: "uppercase",
                    }}
                  >
                    {t("singularity.consensus.peakSignal")}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", letterSpacing: "0.1em", color: BLUE_DIM }}>
                    {t("singularity.consensus.sealed", { count: voteCount })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="content-text" style={{ fontFamily: TERM_FONT, color: GREEN_DIM, margin: 0 }}>
                {t("singularity.consensus.none")}
              </p>
            )}
          </section>

          {/* ── Sealed praxis (completed submissions) ── */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                marginBottom: "var(--space-lg)",
                flexWrap: "wrap",
              }}
            >
              <h2 style={sectionH2}>{t("singularity.sealedHeading")}</h2>
              <span style={sectionRule} />
              <span style={{ fontSize: "var(--text-xs)", letterSpacing: "0.12em", color: BLUE_DIM }}>
                {t("singularity.sealedCount", { count: submissions.length })}
              </span>
              <div style={{ display: "flex", gap: 0 }}>
                {(["score", "recent"] as const).map((sort) => {
                  const on = submissionSort === sort;
                  return (
                    <button
                      key={sort}
                      onClick={() => setSubmissionSort(sort)}
                      style={{
                        fontFamily: TERM_FONT,
                        fontSize: "var(--text-xs)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        padding: "var(--space-xs) var(--space-md)",
                        background: on ? "color-mix(in srgb, var(--faction-singularity-card-text) 14%, transparent)" : "transparent",
                        color: on ? GREEN : BLUE_DIM,
                        border: `1px solid ${on ? GREEN : RULE}`,
                        cursor: "pointer",
                      }}
                    >
                      {sort === "score"
                        ? t("singularity.sort.highestSignal")
                        : t("singularity.sort.recent")}
                    </button>
                  );
                })}
              </div>
            </div>

            {sortedSubmissions.length === 0 ? (
              <p className="content-text" style={{ fontFamily: TERM_FONT, color: GREEN_DIM, margin: 0 }}>
                {t("singularity.empty")}
              </p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2xl) var(--space-xl)", alignItems: "flex-start" }}>
                  {sortedSubmissions.slice(0, 4).map((s) => (
                    <div key={s.id} style={{ position: "relative", paddingTop: s.id === topId ? "var(--space-xl)" : 0 }}>
                      {s.id === topId && (
                        <div
                          style={{
                            position: "absolute",
                            top: -2,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 3,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "var(--space-xs)",
                            whiteSpace: "nowrap",
                            background: BLACK,
                            border: `1px solid ${GREEN}`,
                            color: GREEN,
                            fontFamily: TERM_FONT,
                            fontSize: "var(--text-xs)",
                            letterSpacing: "0.16em",
                            padding: "var(--space-xs) var(--space-md)",
                            boxShadow: "0 0 12px rgba(74,222,128,0.4)",
                          }}
                        >
                          <span style={{ fontSize: "var(--text-lg)", lineHeight: 1 }}>⚜</span>{" "}
                          {t("singularity.highestSignal")}
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
                        fontFamily: TERM_FONT,
                        fontSize: "var(--text-base)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: BLUE,
                        textDecoration: "none",
                      }}
                    >
                      {t("singularity.viewAll", { count: submissions.length })}
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
