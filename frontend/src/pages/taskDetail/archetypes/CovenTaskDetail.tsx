import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { mediaUrl } from "../../../utils/media";
import { ErrorBanner, relationOf } from "./shared";
import type { TaskSignupOut } from "../../../api/tasks";
import type { PraxisCardOut } from "../../../api/praxis";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * Warriors of Whimsy task-detail archetype — the job rendered as a
 * "whimsy.exe" desktop window: a pink computer-witch chrome with a
 * traffic-light title bar, a dotted desktop body, Caveat-script headings,
 * sparkle charms, "spells cast" completions (the most-loved one wears a
 * fleur-de-lis), and a playful party-voiced CTA. Ported visually from the
 * WoW design kit (WhimsyTaskDetail.tsx); wired to the real
 * {@link TaskDetailState}. The kit's demo props, FactionPraxisCard /
 * FactionCommentBox, top <nav> and group-chat block are discarded — the real
 * <PraxisCard> and the shared state replace them.
 */

const PINK = "var(--faction-wow)";
const TITLE_TEXT = "var(--faction-wow-title-text)";
const CARD_TEXT = "var(--faction-wow-card-text)";
const CARD_MUTED = "var(--faction-wow-card-muted)";
const WIN_BORDER = "var(--faction-wow-win-border)";
const NOTEPAD_BG = "var(--faction-wow-notepad-bg)";
const NOTEPAD_BORDER = "var(--faction-wow-notepad-border)";
const DOT = "var(--faction-wow-dot)";
const SCRIPT = "var(--faction-wow-card-font)"; // Caveat
const BODY = "var(--font-body)"; // Courier Prime
const ACCENT = "var(--font-accent)"; // Bebas Neue
const ON_ACCENT = "var(--color-text-on-accent)";

/** Sparkle charm — the kit's signature four-point star. */
function Sparkle({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={color}
      />
    </svg>
  );
}

/** Caveat-script section heading with a sparkle and a dashed running rule. */
function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <Sparkle size={18} color={PINK} />
      <h2
        className="content-title"
        style={{
          fontFamily: SCRIPT,
          margin: 0,
          color: TITLE_TEXT,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </h2>
      <span
        style={{
          flex: 1,
          height: 2,
          background: `repeating-linear-gradient(90deg, ${PINK} 0 8px, transparent 8px 14px)`,
        }}
      />
    </div>
  );
}

/** Real signup avatars as a little coven row, tilted, with friend/foe charms. */
function PartyRow({
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
      style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexWrap: "wrap" }}
    >
      {signups.map((m, index) => {
        const rel = relationOf(m.character_id, friends, foes);
        const relColor = rel === "friend" ? PINK : "var(--faction-wow-ivy)";
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
              transform: `rotate(${index % 2 ? 4 : -3}deg)`,
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
                  border: `2px solid ${PINK}`,
                }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${PINK} 22%, transparent)`,
                  border: `2px solid ${PINK}`,
                  alignItems: "center",
                  justifyContent: "center",
                  color: TITLE_TEXT,
                  fontFamily: SCRIPT,
                  fontSize: "var(--text-content)",
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
                  right: -3,
                  bottom: -3,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: relColor,
                  border: `1.5px solid ${NOTEPAD_BG}`,
                }}
              />
            )}
          </Link>
        );
      })}
      <span
        style={{
          fontFamily: SCRIPT,
          fontSize: "var(--text-content)",
          color: PINK,
          marginLeft: "var(--space-sm)",
        }}
      >
        {t("wow.inTheParty")}
      </span>
    </div>
  );
}

export default function CovenTaskDetail({ state }: { state: TaskDetailState }) {
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

  // Top-rated submission gets the "most loved" fleur-de-lis charm.
  const topId: number | null = submissions.length
    ? submissions.reduce(
        (best: PraxisCardOut, candidate: PraxisCardOut) =>
          (candidate.score ?? 0) > (best.score ?? 0) ? candidate : best,
      ).id
    : null;

  /** The pill stat skin used across the hero chrome. */
  const pill: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-sm)",
    fontSize: "var(--text-md)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "var(--space-sm) var(--space-lg)",
    borderRadius: 20,
    background: "var(--faction-wow-light)",
    color: CARD_TEXT,
    border: `1.5px solid var(--faction-wow-border)`,
  };

  return (
    <div className="py-8" style={{ fontFamily: BODY, color: CARD_TEXT }}>
      {/* ── Breadcrumb ── */}
      <nav
        className="font-body mb-4"
        style={{
          fontSize: "var(--text-base)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: CARD_MUTED,
        }}
      >
        <Link to="/tasks" style={{ color: PINK, textDecoration: "none" }}>
          {t("wow.breadcrumb")}
        </Link>
        <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>›</span>
        <span style={{ fontFamily: SCRIPT, fontSize: "var(--text-content)" }}>
          {t("wow.faction")}
        </span>
        <span style={{ opacity: 0.5, margin: "0 var(--space-sm)" }}>›</span>
        <span style={{ color: PINK }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 920, display: "flex", flexDirection: "column", gap: "var(--space-2xl)" }}>
        {/* ── HERO · whimsy.exe window ── */}
        <div
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: `2px solid ${WIN_BORDER}`,
            boxShadow: `0 10px 26px color-mix(in srgb, ${PINK} 32%, transparent)`,
            transform: "rotate(-0.5deg)",
          }}
        >
          {/* title bar — traffic lights + window name */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              padding: "var(--space-sm) var(--space-lg)",
              background: `linear-gradient(180deg, var(--faction-wow-title-from), var(--faction-wow-title-to))`,
              borderBottom: `2px solid ${WIN_BORDER}`,
            }}
          >
            {["var(--faction-wow-scrap-deep)", "var(--faction-wow-tape)", "var(--faction-wow-ivy-leaf)"].map(
              (lightColor) => (
                <span
                  key={lightColor}
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: lightColor,
                    border: "1.2px solid rgba(255,255,255,0.7)",
                  }}
                />
              ),
            )}
            <span
              className="content-text"
              style={{
                marginLeft: "auto",
                fontFamily: SCRIPT,
                color: ON_ACCENT,
                textShadow: `1px 1px 0 ${TITLE_TEXT}`,
              }}
            >
              {t("wow.window")}
            </span>
          </div>

          {/* desktop body */}
          <div
            style={{
              position: "relative",
              padding: "var(--space-2xl) var(--space-2xl) var(--space-2xl)",
              background: NOTEPAD_BG,
              backgroundImage: `radial-gradient(${DOT} 1.3px, transparent 1.3px)`,
              backgroundSize: "14px 14px",
            }}
          >
            <Sparkle
              size={22}
              color="var(--faction-wow-tape)"
              style={{
                position: "absolute",
                top: 18,
                right: 22,
                transform: "rotate(10deg)",
              }}
            />
            <Sparkle
              size={14}
              color={PINK}
              style={{
                position: "absolute",
                top: 64,
                right: 70,
                transform: "rotate(-12deg)",
              }}
            />
            <div
              style={{
                fontSize: "var(--text-sm)",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: CARD_MUTED,
                marginBottom: "var(--space-sm)",
              }}
            >
              {task.status === "active" ? t("wow.statusOpen") : task.status}
            </div>
            <div
              className="content-title"
              style={{
                fontFamily: SCRIPT,
                lineHeight: 0.92,
                color: TITLE_TEXT,
                marginBottom: "var(--space-lg)",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-md)",
                flexWrap: "wrap",
              }}
            >
              <span style={pill}>
                <Sparkle size={11} color={PINK} />{" "}
                {t("wow.level", { level: task.level_required })}
              </span>
              <span
                className="content-title"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  fontFamily: SCRIPT,
                  color: PINK,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 36 36">
                  <path
                    d="M18 31C7 23 3 17 6.5 11 9 6.8 14 6.5 16 10c.9 1.5 1.6 2.7 2 3.4.4-.7 1.1-1.9 2-3.4 2-3.5 7-3.2 9.5 1C33 17 29 23 18 31Z"
                    fill={PINK}
                    stroke={NOTEPAD_BG}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("wow.sparks", { points: modifiedPoints })}
              </span>
              <span style={pill}>
                {t("wow.onView", {
                  signups: signups.length,
                  completed: submissions.length,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Signup CTA bar (only when sign-up is possible) ── */}
        {canSignUp && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-lg)",
                flexWrap: "wrap",
                border: `2px solid ${WIN_BORDER}`,
                borderRadius: 12,
                background: NOTEPAD_BG,
                padding: "var(--space-lg) var(--space-xl)",
                boxShadow: `4px 4px 0 var(--faction-wow-scrap-deep)`,
              }}
            >
              <button
                onClick={handleSignup}
                style={{
                  cursor: "pointer",
                  fontFamily: BODY,
                  fontSize: "var(--text-md)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: ON_ACCENT,
                  padding: "var(--space-md) var(--space-xl)",
                  border: `1.5px solid ${WIN_BORDER}`,
                  borderRadius: 10,
                  background: `linear-gradient(180deg, ${PINK}, var(--faction-wow-card-muted))`,
                  boxShadow: `0 4px 10px color-mix(in srgb, ${PINK} 35%, transparent)`,
                }}
              >
                {t("wow.signup.cta", { points: modifiedPoints })}
              </button>
              <div className="content-text" style={{ fontFamily: SCRIPT, color: PINK }}>
                {t("wow.signup.note")}
              </div>
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "var(--text-base)",
                  letterSpacing: "0.06em",
                  color: CARD_MUTED,
                  textAlign: "right",
                }}
              >
                <div>
                  {t("wow.signup.slots", { open: slotsOpen, max: maxTaskSlots })}
                </div>
                <div>
                  {t("wow.signup.levelRequired", { level: task.level_required })}
                </div>
              </div>
            </div>
            <ErrorBanner message={signupError} />
          </div>
        )}

        {/* ── My submission — edit the spell ── */}
        {mySubmission && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-lg)",
              flexWrap: "wrap",
              border: `2px solid ${NOTEPAD_BORDER}`,
              borderRadius: 12,
              background: NOTEPAD_BG,
              padding: "var(--space-lg) var(--space-xl)",
            }}
          >
            <span className="content-text" style={{ fontFamily: SCRIPT, color: TITLE_TEXT }}>
              {t("wow.submitted.text")}
            </span>
            <Link
              to={`/praxes/${mySubmission.id}/edit`}
              style={{
                fontFamily: BODY,
                fontSize: "var(--text-md)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: ON_ACCENT,
                padding: "var(--space-md) var(--space-xl)",
                border: `1.5px solid ${WIN_BORDER}`,
                borderRadius: 10,
                background: `linear-gradient(180deg, ${PINK}, var(--faction-wow-card-muted))`,
                textDecoration: "none",
              }}
            >
              {t("wow.submitted.edit")}
            </Link>
          </div>
        )}

        {/* ── In progress — continue / drop ── */}
        {!mySubmission && isInProgress && inProgressPraxisId !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-lg)",
              flexWrap: "wrap",
              border: `2px solid ${NOTEPAD_BORDER}`,
              borderRadius: 12,
              background: NOTEPAD_BG,
              padding: "var(--space-lg) var(--space-xl)",
            }}
          >
            <span className="content-text" style={{ fontFamily: SCRIPT, color: TITLE_TEXT }}>
              {t("wow.inProgress.text")}
            </span>
            <Link
              to={`/praxes/${inProgressPraxisId}/edit`}
              style={{
                fontFamily: BODY,
                fontSize: "var(--text-md)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: ON_ACCENT,
                padding: "var(--space-md) var(--space-xl)",
                border: `1.5px solid ${WIN_BORDER}`,
                borderRadius: 10,
                background: `linear-gradient(180deg, ${PINK}, var(--faction-wow-card-muted))`,
                textDecoration: "none",
              }}
            >
              {t("wow.inProgress.continue")}
            </Link>
            <button
              onClick={handleDrop}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: SCRIPT,
                fontSize: "var(--text-content)",
                color: CARD_MUTED,
              }}
            >
              {t("wow.inProgress.drop")}
            </button>
          </div>
        )}

        {/* ── The party so far (signups) ── */}
        {signups.length > 0 && (
          <section>
            <SectionHead>{t("wow.partyHeading")}</SectionHead>
            <PartyRow signups={signups} friends={friends} foes={foes} />
          </section>
        )}

        {/* ── What we're asking (description) ── */}
        <section>
          <SectionHead>{t("wow.askingHeading")}</SectionHead>
          <div
            style={{
              border: `2px solid ${NOTEPAD_BORDER}`,
              borderRadius: 12,
              background: NOTEPAD_BG,
              padding: "var(--space-xl) var(--space-2xl)",
              maxWidth: 640,
            }}
          >
            <p
              className="content-text"
              style={{
                fontFamily: BODY,
                lineHeight: 1.75,
                color: CARD_TEXT,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {task.description || t("wow.askingEmpty")}
            </p>
          </div>
        </section>

        {/* ── The love so far (vote aggregate) ── */}
        <section>
          <SectionHead>{t("wow.loveHeading")}</SectionHead>
          {voteCount > 0 ? (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-md)" }}>
              <span
                className="content-title"
                style={{
                  fontFamily: ACCENT,
                  lineHeight: 0.8,
                  color: PINK,
                }}
              >
                {topScore}
              </span>
              <div style={{ paddingBottom: "var(--space-sm)" }}>
                <div
                  className="content-text"
                  style={{
                    fontFamily: SCRIPT,
                    color: TITLE_TEXT,
                  }}
                >
                  {t("wow.love.top")}
                </div>
                <div style={{ fontSize: "var(--text-base)", color: CARD_MUTED }}>
                  {t("wow.love.adored", { count: voteCount })}
                </div>
              </div>
            </div>
          ) : (
            <p className="content-text" style={{ fontFamily: SCRIPT, color: PINK }}>
              {t("wow.love.none")}
            </p>
          )}
        </section>

        {/* ── Spells cast (completed praxis) ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "var(--space-md)",
              marginBottom: "var(--space-lg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flex: 1 }}>
              <Sparkle size={18} color={PINK} />
              <h2
                className="content-title"
                style={{
                  fontFamily: SCRIPT,
                  margin: 0,
                  color: TITLE_TEXT,
                  whiteSpace: "nowrap",
                }}
              >
                {t("wow.spellsHeading", { count: submissions.length })}
              </h2>
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {(["score", "recent"] as const).map((sort) => {
                const on = submissionSort === sort;
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: BODY,
                      fontSize: "var(--text-sm)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      padding: "var(--space-xs) var(--space-md)",
                      borderRadius: on ? 8 : 0,
                      background: on ? PINK : "transparent",
                      color: on ? ON_ACCENT : CARD_MUTED,
                      border: `1.5px solid ${on ? PINK : NOTEPAD_BORDER}`,
                      cursor: "pointer",
                    }}
                  >
                    {sort === "score"
                      ? t("wow.sort.mostLoved")
                      : t("wow.sort.recent")}
                  </button>
                );
              })}
            </div>
          </div>

          {sortedSubmissions.length === 0 ? (
            <p className="content-text" style={{ fontFamily: SCRIPT, color: PINK }}>
              {t("wow.empty")}
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-2xl) var(--space-xl)",
                  alignItems: "flex-start",
                }}
              >
                {sortedSubmissions.slice(0, 4).map((s) => (
                  <div key={s.id} style={{ position: "relative", paddingTop: "var(--space-xl)" }}>
                    {s.id === topId && (
                      <div
                        style={{
                          position: "absolute",
                          top: -2,
                          left: "50%",
                          transform: "translateX(-50%) rotate(-2deg)",
                          zIndex: 3,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-xs)",
                          whiteSpace: "nowrap",
                          background: PINK,
                          color: ON_ACCENT,
                          fontFamily: SCRIPT,
                          fontSize: "var(--text-content)",
                          padding: "var(--space-xs) var(--space-lg)",
                          borderRadius: 14,
                          boxShadow: `2px 3px 0 var(--faction-wow-scrap-deep)`,
                        }}
                      >
                        <span style={{ fontSize: "var(--text-lg)", lineHeight: 1 }}>⚜</span>{" "}
                        {t("wow.mostLoved")}
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
                    className="content-text"
                    style={{
                      fontFamily: SCRIPT,
                      color: PINK,
                      textDecoration: "none",
                    }}
                  >
                    {t("wow.viewAll", { count: submissions.length })}
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
