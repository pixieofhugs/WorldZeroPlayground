import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { UaSigil } from "../../../components/cards/UaSigil";
import {
  UA_DISPLAY,
  UA_EYEBROW,
  UA_TEXT,
  UaEnsoScore,
  UaInkColumn,
  uaShade,
} from "../../../components/cards/uaAtoms";
import { mediaUrl } from "../../../utils/media";
import { ErrorBanner, relationOf } from "./shared";
import type { TaskSignupOut } from "../../../api/tasks";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * UA task detail — the sheet (#851).
 *
 * The gilt salon is dead: no crest shield, no gold-leaf sandwich, no dot-grid
 * parchment, no fleur-de-lis. A task reads as a sheet of sun-bleached stock
 * with one orange hairline down the left margin, the marks held in an ensō, and
 * quiet uppercase labels over hairline rules.
 *
 * The mandala is ABSENT here (brief §5). The pattern is allowed on exactly
 * three surfaces — page backdrop, faction hero, join card — and a detail page
 * is dense reading; the UA page backdrop already carries the texture behind it.
 *
 * Both themes come from the `[data-theme="dark"]` cascade. This page used to
 * declare itself always-light and paint with four font tokens that were never
 * declared anywhere (`--ua-display`, `--ua-engraved`, `--ua-mono`,
 * `--ua-serif`) — undefined custom properties that silently fell back to the
 * inherited face. Both are fixed here.
 */

/** Roman numeral for the practice's "ANNO" (level) label. */
function romanLevel(n: number): string {
  return (
    ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][
      Math.max(0, Math.min(9, n - 1))
    ] ?? String(n)
  );
}

const PANEL: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-lg)",
  flexWrap: "wrap",
  padding: "var(--space-lg) var(--space-xl)",
  border: "1px solid var(--faction-ua-rule)",
  borderRadius: "var(--radius-sm)",
  background: "var(--faction-ua-card-bg)",
};

/**
 * The banner surface for a signup error.
 *
 * #848 turned `--faction-ua-light` from `rgba(194,84,31,.08)` into an opaque
 * `#f2e0cb`; what used to be a whisper behind this banner became a solid wash.
 * It now names the panel token it was always reaching for, and takes an accent
 * ink that clears AA on it in both themes.
 */
const BANNER: CSSProperties = {
  flexBasis: "100%",
  marginTop: 0,
  background: "var(--faction-ua-panel)",
  border: "1px solid var(--faction-ua-border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--faction-ua-card-accent)",
};

/** Solid-fill affordance — the practice's one saturated note. */
const FILLED_ACTION: CSSProperties = {
  cursor: "pointer",
  fontFamily: UA_TEXT,
  fontSize: "var(--text-xl)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--faction-ua-on-fill)",
  background: "var(--faction-ua)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "var(--space-md) var(--space-xl)",
  textDecoration: "none",
};

/** Section header — the eyebrow over a hairline that runs to the margin. */
function SectionHead({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-lg)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <h2 style={{ ...UA_EYEBROW, margin: 0, whiteSpace: "nowrap" }}>{title}</h2>
      <span
        style={{ flex: 1, height: 1, background: "var(--faction-ua-rule)" }}
      />
      {trailing}
    </div>
  );
}

/** Those practising — signup portraits with friend/foe dots. */
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        flexWrap: "wrap",
      }}
    >
      {signups.map((hand) => {
        const rel = relationOf(hand.character_id, friends, foes);
        return (
          <Link
            key={hand.character_id}
            to={`/characters/${hand.character_id}`}
            title={`${hand.display_name}${rel ? ` · ${rel}` : ""}`}
            style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}
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
                  border: "1.5px solid var(--faction-ua-rule)",
                }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--faction-ua-panel)",
                  border: "1.5px solid var(--faction-ua-rule)",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--faction-ua-card-text)",
                  fontFamily: UA_DISPLAY,
                  fontWeight: 600,
                  fontSize: "var(--text-content)",
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
                  background:
                    rel === "friend"
                      ? "var(--faction-ua)"
                      : "var(--faction-ua-vermil)",
                  border: "2px solid var(--faction-ua-card-bg)",
                }}
              />
            )}
          </Link>
        );
      })}
      <span style={{ ...UA_EYEBROW, marginLeft: "var(--space-xs)" }}>
        {t("ua.matriculated")}
      </span>
    </div>
  );
}

/** One count from the sheet's head — a numeral over its label. */
function StatCell({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        flex: "1 1 140px",
        minWidth: 140,
        padding: "var(--space-lg) var(--space-xl)",
        borderRight: last ? undefined : "1px solid var(--faction-ua-hair)",
      }}
    >
      <div
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 600,
          fontSize: "var(--text-title)",
          lineHeight: 1,
          color: "var(--faction-ua-card-text)",
        }}
      >
        {children}
      </div>
      <div style={{ ...UA_EYEBROW, marginTop: "var(--space-xs)" }}>{label}</div>
    </div>
  );
}

export default function UaTaskDetail({ state }: { state: TaskDetailState }) {
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

  const statusVoice =
    task.status === "active" ? t("ua.statusOpen") : task.status;
  const commissionNo = String(task.id).padStart(4, "0");

  // The truest hand on the sheet wears a quiet orange tag.
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  return (
    <div
      className="py-8"
      style={{ fontFamily: UA_TEXT, color: "var(--faction-ua-page-text)" }}
    >
      {/* ── Breadcrumb ── */}
      <nav className="mb-4" style={UA_EYEBROW}>
        <Link
          to="/tasks"
          style={{ color: "var(--faction-ua-card-accent)", textDecoration: "none" }}
        >
          {t("default.breadcrumb")}
        </Link>
        <span style={{ margin: "0 var(--space-sm)" }}>·</span>
        <span>{t("ua.faction")}</span>
        <span style={{ margin: "0 var(--space-sm)" }}>·</span>
        <span style={{ color: "var(--faction-ua-card-accent)" }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 920 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2xl)",
          }}
        >
          {/* ── THE SHEET — masthead + counts ── */}
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              border: "1px solid var(--faction-ua-rule)",
              borderRadius: "var(--radius-md)",
              background: "var(--faction-ua-card-bg)",
              boxShadow: `0 14px 38px -24px ${uaShade(52)}`,
            }}
          >
            <div
              style={{
                position: "relative",
                background:
                  "linear-gradient(160deg, var(--faction-ua-lift), var(--faction-ua-panel))",
                borderBottom: "1px solid var(--faction-ua-hair)",
                padding: "var(--space-2xl) var(--space-2xl) var(--space-xl)",
              }}
            >
              <UaInkColumn
                style={{
                  left: "var(--space-md)",
                  top: "var(--space-2xl)",
                  bottom: "var(--space-xl)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  paddingLeft: "var(--space-lg)",
                  display: "flex",
                  gap: "var(--space-2xl)",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <UaEnsoScore
                  size={124}
                  value={modifiedPoints}
                  unit={t("ua.stats.honoraria")}
                  valueColor="var(--faction-ua-vermil)"
                />
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={UA_EYEBROW}>{t("ua.masthead")}</div>
                  <div style={{ ...UA_EYEBROW, letterSpacing: "0.3em" }}>
                    {t("ua.commissionLine", { number: commissionNo })}
                  </div>
                  <h1
                    style={{
                      fontFamily: UA_DISPLAY,
                      fontWeight: 600,
                      fontSize: "var(--text-heading)",
                      lineHeight: 1.06,
                      letterSpacing: "-0.01em",
                      color: "var(--faction-ua-card-text)",
                      margin: "var(--space-sm) 0 var(--space-md)",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {task.title}
                  </h1>
                  {/* The status tag. It used to paint its ink with
                      --faction-ua-light, a background tint that was invisible
                      at 8% alpha and pale cream once #848 made it opaque; the
                      ink token for a solid fill is --faction-ua-on-fill. */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                      background: "var(--faction-ua)",
                      color: "var(--faction-ua-on-fill)",
                      fontFamily: UA_TEXT,
                      fontSize: "var(--text-md)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      borderRadius: "var(--radius-sm)",
                      padding: "var(--space-xs) var(--space-md)",
                    }}
                  >
                    {statusVoice}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <StatCell label={t("ua.stats.anno")}>
                {romanLevel(task.level_required)}
              </StatCell>
              <StatCell label={t("ua.stats.honorariaUnit")}>
                {modifiedPoints}
              </StatCell>
              <StatCell label={t("ua.stats.onView")} last>
                <span
                  style={{
                    fontSize: "var(--text-content)",
                    lineHeight: 1.2,
                    color: "var(--faction-ua-card-body)",
                  }}
                >
                  {t("ua.stats.onViewValue", {
                    signups: signups.length,
                    completed: submissions.length,
                  })}
                </span>
              </StatCell>
            </div>
          </div>

          {/* ── Sign-up / signed-on states ── */}
          {canSignUp && (
            <div style={PANEL}>
              <button onClick={handleSignup} style={FILLED_ACTION}>
                {t("ua.signup.cta", { points: modifiedPoints })}
              </button>
              <div
                style={{
                  fontFamily: UA_TEXT,
                  fontSize: "var(--text-content)",
                  color: "var(--faction-ua-card-body)",
                }}
              >
                {t("ua.signup.meta", {
                  open: slotsOpen,
                  max: maxTaskSlots,
                  level: romanLevel(task.level_required),
                })}
              </div>
              <ErrorBanner message={signupError} style={BANNER} />
            </div>
          )}

          {mySubmission && (
            <div style={PANEL}>
              <span
                style={{
                  ...UA_EYEBROW,
                  color: "var(--faction-ua-card-accent)",
                }}
              >
                {t("ua.submitted.text")}
              </span>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                style={{ ...FILLED_ACTION, marginLeft: "auto" }}
              >
                {t("ua.submitted.edit")}
              </Link>
            </div>
          )}

          {!mySubmission && isInProgress && inProgressPraxisId !== null && (
            <div style={PANEL}>
              <span
                style={{
                  ...UA_EYEBROW,
                  color: "var(--faction-ua-card-accent)",
                }}
              >
                {t("ua.inProgress.text")}
              </span>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{ ...FILLED_ACTION, marginLeft: "auto" }}
              >
                {t("ua.inProgress.continue")}
              </Link>
              <button
                onClick={handleDrop}
                style={{
                  ...UA_EYEBROW,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("ua.inProgress.drop")}
              </button>
              <ErrorBanner message={signupError} style={BANNER} />
            </div>
          )}

          {/* ── The Mark — the user-written brief ── */}
          <section>
            <SectionHead title={t("ua.commissionHeading")} />
            <div
              style={{
                border: "1px solid var(--faction-ua-rule)",
                borderRadius: "var(--radius-sm)",
                background: "var(--faction-ua-card-bg)",
                padding: "var(--space-xl)",
                maxWidth: 660,
              }}
            >
              <p
                className="content-text"
                style={{
                  fontFamily: UA_TEXT,
                  lineHeight: 1.7,
                  color: "var(--faction-ua-card-body)",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description || t("ua.commissionEmpty")}
              </p>
            </div>
          </section>

          {/* ── Those practising ── */}
          {signups.length > 0 && (
            <section>
              <SectionHead title={t("ua.matriculatedHeading")} />
              <HandsRow signups={signups} friends={friends} foes={foes} />
            </section>
          )}

          {/* ── The Reading — read-only aggregate ── */}
          <section>
            <SectionHead title={t("ua.critiqueHeading")} />
            {voteCount > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-lg)",
                }}
              >
                <UaEnsoScore
                  size={96}
                  value={topScore}
                  valueColor="var(--faction-ua-vermil)"
                />
                <div>
                  <div
                    style={{
                      fontFamily: UA_DISPLAY,
                      fontWeight: 600,
                      fontSize: "var(--text-title)",
                      lineHeight: 1.1,
                      color: "var(--faction-ua-card-text)",
                    }}
                  >
                    {t("ua.critique.finest")}
                  </div>
                  <div style={{ ...UA_EYEBROW, marginTop: "var(--space-xs)" }}>
                    {t("ua.critique.appraised", { count: voteCount })}
                  </div>
                </div>
              </div>
            ) : (
              <p
                className="content-text"
                style={{
                  fontFamily: UA_TEXT,
                  color: "var(--faction-ua-card-muted)",
                }}
              >
                {t("ua.critique.none")}
              </p>
            )}
          </section>

          {/* ── Sealed work ── */}
          <section>
            <SectionHead
              title={t("ua.salonWallHeading")}
              trailing={
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  {(["score", "recent"] as const).map((sort) => {
                    const on = submissionSort === sort;
                    return (
                      <button
                        key={sort}
                        onClick={() => setSubmissionSort(sort)}
                        style={{
                          ...UA_EYEBROW,
                          padding: "var(--space-xs) var(--space-md)",
                          borderRadius: "var(--radius-sm)",
                          background: on
                            ? "var(--faction-ua)"
                            : "transparent",
                          color: on
                            ? "var(--faction-ua-on-fill)"
                            : "var(--faction-ua-card-muted)",
                          border: `1px solid ${
                            on ? "var(--faction-ua)" : "var(--faction-ua-rule)"
                          }`,
                          cursor: "pointer",
                        }}
                      >
                        {sort === "score"
                          ? t("ua.sort.finest")
                          : t("ua.sort.recent")}
                      </button>
                    );
                  })}
                </div>
              }
            />
            {sortedSubmissions.length === 0 ? (
              <p
                className="content-text"
                style={{
                  fontFamily: UA_TEXT,
                  color: "var(--faction-ua-card-muted)",
                }}
              >
                {t("ua.empty")}
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
                    <div
                      key={s.id}
                      style={{
                        position: "relative",
                        paddingTop: "var(--space-xl)",
                      }}
                    >
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
                            gap: "var(--space-xs)",
                            whiteSpace: "nowrap",
                            background: "var(--faction-ua)",
                            color: "var(--faction-ua-on-fill)",
                            fontFamily: UA_TEXT,
                            fontSize: "var(--text-md)",
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            borderRadius: "var(--radius-sm)",
                            padding: "var(--space-xs) var(--space-md)",
                          }}
                        >
                          <UaSigil width={13} height={13} />
                          {t("ua.finestHand")}
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
                        fontFamily: UA_TEXT,
                        fontSize: "var(--text-content)",
                        color: "var(--faction-ua-card-accent)",
                        textDecoration: "none",
                      }}
                    >
                      {t("ua.viewAll", { count: submissions.length })}
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
