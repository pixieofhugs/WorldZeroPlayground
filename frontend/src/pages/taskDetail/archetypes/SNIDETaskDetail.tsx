import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PraxisCard from "../../../components/PraxisCard";
import { mediaUrl } from "../../../utils/media";
import { factionName } from "../../../utils/factions";
import { SnideSigil } from "../../../components/snide/snideAtoms";
import { ErrorBanner, relationOf } from "./shared";
import type { TaskSignupOut } from "../../../api/tasks";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * S.N.I.D.E. task-detail archetype — the "ransom dispatch": an OPEN-CASE
 * DOSSIER whose title is cut from a ransom note (mixed-font chips), a black-ink
 * CTA slab, a lined-paper brief, accomplices on file, a read-only mob verdict,
 * and CASES CLOSED with a ⚜ TOP MARKS badge on the highest-scored completion.
 * Ported from the improved SNIDE design kit (SnideTaskDetail.tsx) and wired to
 * the real {@link TaskDetailState}.
 *
 * Always-dark by styling its own container with --faction-snide-* tokens; it
 * does NOT mutate the document theme.
 *
 * Decorative / not backend-backed (marked inline): the "job no." (derived from
 * task.id). EvidenceTag labels are relabelled to honest counts.
 */

const INK = "var(--faction-snide-ink)";
const ACID = "var(--faction-snide-acid)";
const PINK = "var(--faction-snide-pink)";
const PAPER = "var(--faction-snide-paper)";

/** The shared "rap sheet" CTA skin — a skewed, acid-shadowed slab button/link. */
function rapSheetStyle(background: string, big = false): CSSProperties {
  return {
    display: "inline-block",
    cursor: "pointer",
    border: `2px solid ${INK}`,
    background,
    color: "#fff",
    fontFamily: "var(--faction-snide-font-black)",
    fontSize: big ? 15 : 14,
    letterSpacing: "0.03em",
    padding: big ? "14px 26px" : "12px 22px",
    textDecoration: "none",
    transform: "rotate(-1.5deg)",
    boxShadow: `3px 4px 0 ${ACID}`,
  };
}

/* ── Ransom title ──
 * Cut the real task title into ransom-note chips: each word (or word-half for
 * long words) gets its own font / colour / tilt, photocopied out of the page.
 * Purely visual reinterpretation of the real `task.title`. */
const RANSOM_SKINS: ReadonlyArray<{ bg: string; color: string; font: string }> =
  [
    { bg: PAPER, color: INK, font: "var(--faction-snide-font-impact)" },
    { bg: INK, color: ACID, font: "var(--faction-snide-font-black)" },
    { bg: PINK, color: "#fff", font: "var(--faction-snide-font-impact)" },
    { bg: ACID, color: INK, font: "var(--faction-snide-font-black)" },
  ];

/** Split the title into ransom fragments (words, long words halved). */
function ransomFragments(title: string): string[] {
  const out: string[] = [];
  for (const word of title.trim().split(/\s+/).filter(Boolean)) {
    if (word.length > 7) {
      const mid = Math.ceil(word.length / 2);
      out.push(word.slice(0, mid), word.slice(mid));
    } else {
      out.push(word);
    }
  }
  return out.length ? out : [title];
}

function RansomChip({
  text,
  index,
}: {
  text: string;
  index: number;
}) {
  const skin = RANSOM_SKINS[index % RANSOM_SKINS.length];
  const big = index % 2 === 0;
  const rots = [-4, 3, -2, 4];
  return (
    <span
      style={{
        display: "inline-block",
        background: skin.bg,
        color: skin.color,
        fontFamily: skin.font,
        fontSize: big ? 38 : 32,
        lineHeight: 0.9,
        padding: "2px 10px 0",
        textTransform: "uppercase",
        transform: `rotate(${rots[index % rots.length]}deg)`,
        boxShadow: "1.5px 2.5px 0 rgba(0,0,0,0.4)",
        border: skin.bg === PAPER ? `1px solid ${INK}` : "none",
      }}
    >
      {text}
    </span>
  );
}

function EvidenceTag({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "9px 14px",
        border: `1.5px solid ${INK}`,
        background: accent ? INK : "transparent",
        transform: `rotate(${accent ? -1.5 : 1}deg)`,
        boxShadow: accent ? `2px 3px 0 ${PINK}` : "none",
      }}
    >
      <span
        style={{
          fontFamily: "var(--faction-snide-font-type)",
          fontSize: 8,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: accent
            ? ACID
            : "color-mix(in srgb, var(--faction-snide-ink) 55%, transparent)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--faction-snide-font-impact)",
          fontSize: 26,
          lineHeight: 0.85,
          color: accent ? ACID : INK,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Section marker — acid tape tab with a marker-font label. */
function MarkerTab({ text, rot = -1.5 }: { text: string; rot?: number }) {
  return (
    <div
      style={{
        display: "inline-block",
        background: ACID,
        color: INK,
        fontFamily: "var(--faction-snide-font-marker)",
        fontSize: 17,
        padding: "3px 14px",
        transform: `rotate(${rot}deg)`,
        boxShadow: `2px 2px 0 ${PINK}`,
        marginBottom: 14,
      }}
    >
      {text}
    </div>
  );
}

/** Accomplices on file — real signup avatars, tilted, with friend/foe dots. */
function AccompliceRow({
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
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
    >
      {signups.map((m, i) => {
        const rel = relationOf(m.character_id, friends, foes);
        const relColor = rel === "friend" ? "var(--faction-snide)" : PINK;
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
              transform: `rotate(${i % 2 ? 4 : -3}deg)`,
              boxShadow: "1.5px 2px 0 rgba(0,0,0,0.35)",
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
                  border: "2px solid var(--faction-snide)",
                }}
              />
            ) : (
              <span
                style={{
                  display: "flex",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: INK,
                  border: "2px solid var(--faction-snide)",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ACID,
                  fontFamily: "var(--faction-snide-font-impact)",
                  fontSize: 16,
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
                  border: `1.5px solid ${PAPER}`,
                }}
              />
            )}
          </Link>
        );
      })}
      <span
        style={{
          fontFamily: "var(--faction-snide-font-type)",
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "color-mix(in srgb, var(--faction-snide-wall-text) 55%, transparent)",
          marginLeft: 6,
        }}
      >
        {t("snide.onTheJob")}
      </span>
    </div>
  );
}

export default function SNIDETaskDetail({
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
    modifiedPoints,
    slotsOpen,
    maxTaskSlots,
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

  const wall = "var(--faction-snide-wall-text)";
  const muted = "color-mix(in srgb, var(--faction-snide-wall-text) 55%, transparent)";
  // Decorative: SNIDE invents a "case file number" — derive it from the real id.
  const caseNo = String(task.id).padStart(4, "0");
  const isMeta = task.task_type === "metatask";
  const fragments = ransomFragments(task.title);
  // The highest-scored completion wears the ⚜ TOP MARKS badge.
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  return (
    <div className="py-8" style={{ fontFamily: "var(--faction-snide-font-type)", color: wall }}>
      {/* ── Breadcrumb ── */}
      <nav
        className="mb-4"
        style={{
          fontFamily: "var(--faction-snide-font-type)",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: muted,
        }}
      >
        <Link
          to="/tasks"
          style={{ color: "var(--faction-snide)", textDecoration: "none" }}
        >
          {t("snide.breadcrumb")}
        </Link>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span style={{ fontFamily: "var(--faction-snide-font-cond)", letterSpacing: "0.12em" }}>
          {t("snide.faction")}
        </span>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span style={{ color: wall }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 30 }}>
        {/* ── Open-case dossier header (ransom cut-out title) ── */}
        <div
          style={{
            position: "relative",
            background: PAPER,
            color: INK,
            border: `1.5px solid ${INK}`,
            boxShadow: "6px 7px 0 rgba(0,0,0,0.25)",
            transform: "rotate(-0.5deg)",
            overflow: "hidden",
          }}
        >
          {/* margin stripe (acid-on-green) */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 8,
              background: "var(--faction-snide)",
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent 0 13px, rgba(0,0,0,0.25) 13px 14px)",
            }}
          />
          {/* tape top-right */}
          <div
            className="snide-tape"
            style={{ top: -9, right: 44, width: 64, height: 20, transform: "rotate(6deg)" }}
          />
          <div style={{ position: "relative", display: "flex", gap: 0 }}>
            {/* mugshot panel */}
            <div
              style={{
                flexShrink: 0,
                width: 138,
                background: INK,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "22px 10px",
                backgroundImage:
                  "repeating-linear-gradient(180deg, transparent 0 13px, rgba(182,255,46,0.16) 13px 14px)",
              }}
            >
              <SnideSigil size={58} color={ACID} />
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-impact)",
                  fontSize: 13,
                  letterSpacing: "0.12em",
                  color: ACID,
                  marginTop: 12,
                }}
              >
                {t("snide.jobFile")}
              </div>
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-type)",
                  fontSize: 8,
                  color: "color-mix(in srgb, var(--faction-snide-acid) 60%, var(--faction-snide-ink))",
                  letterSpacing: "0.1em",
                  marginTop: 3,
                }}
              >
                {t("snide.openCase")}
              </div>
            </div>
            {/* case details */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                padding: "24px 24px 22px 20px",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-type)",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--faction-snide-ink) 60%, transparent)",
                  marginBottom: 10,
                }}
              >
                {t("snide.caseFile", { number: caseNo })}
              </div>
              {/* Ransom-note title cut from the real task.title */}
              <h1
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px 5px",
                  alignItems: "center",
                  margin: "0 0 18px",
                }}
              >
                {fragments.map((frag, i) => (
                  <RansomChip key={i} text={frag} index={i} />
                ))}
              </h1>
              {isMeta && (
                <div
                  style={{
                    fontFamily: "var(--faction-snide-font-cond)",
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--faction-snide-pink-deep)",
                    marginBottom: 12,
                  }}
                >
                  {t("snide.metataskFor", {
                    faction: factionName(task.metatask_faction_slug),
                  })}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <EvidenceTag
                  label={t("snide.evidence.points")}
                  value={modifiedPoints}
                  accent
                />
                <EvidenceTag
                  label={t("snide.evidence.level")}
                  value={t("snide.evidence.levelValue", {
                    level: task.level_required,
                  })}
                />
                {/* Honest counts (kit's "filed N times" → real in-progress / closed) */}
                <EvidenceTag
                  label={t("snide.evidence.filed")}
                  value={`${signups.length}`}
                />
                <EvidenceTag
                  label={t("snide.evidence.closed")}
                  value={`${submissions.length}`}
                />
              </div>
              {/* OPEN CASE / real-status stamp */}
              <span
                style={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  fontFamily: "var(--faction-snide-font-cond)",
                  fontSize: 15,
                  letterSpacing: "0.14em",
                  color: "color-mix(in srgb, var(--faction-snide-pink-deep) 75%, transparent)",
                  border: "2.5px solid color-mix(in srgb, var(--faction-snide-pink-deep) 70%, transparent)",
                  padding: "3px 12px",
                  transform: "rotate(-7deg)",
                }}
              >
                {task.status === "active"
                  ? t("snide.openCase")
                  : task.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* ── CTA slab (black-ink dispatch bar) ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
            background: INK,
            padding: "16px 20px",
            transform: "rotate(-0.4deg)",
            boxShadow: "4px 5px 0 rgba(0,0,0,0.2)",
          }}
        >
          {canSignUp && (
            <>
              <button onClick={handleSignup} style={rapSheetStyle("var(--faction-snide-acid-deep)", true)}>
                {t("snide.signup.cta")}
              </button>
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-marker)",
                  fontSize: 13,
                  color: PINK,
                  transform: "rotate(-1deg)",
                }}
              >
                {t("snide.signup.warning")}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: muted,
                  width: "100%",
                }}
              >
                {t("snide.signup.meta", {
                  points: modifiedPoints,
                  open: slotsOpen,
                  max: maxTaskSlots,
                  level: task.level_required,
                })}
              </div>
            </>
          )}

          {mySubmission && (
            <>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                style={rapSheetStyle(PINK)}
              >
                {t("snide.submitted.edit")}
              </Link>
              <div
                style={{
                  fontFamily: "var(--faction-snide-font-marker)",
                  fontSize: 13,
                  color: ACID,
                  transform: "rotate(-1deg)",
                }}
              >
                {t("snide.submitted.note")}
              </div>
            </>
          )}

          {!mySubmission && isInProgress && inProgressPraxisId !== null && (
            <>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={rapSheetStyle("var(--faction-snide-acid-deep)")}
              >
                {t("snide.inProgress.continue")}
              </Link>
              <button
                onClick={handleDrop}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--faction-snide-font-marker)",
                  fontSize: 13,
                  color: PINK,
                  transform: "rotate(-1deg)",
                }}
              >
                {t("snide.inProgress.drop")}
              </button>
            </>
          )}

          {/* Mob verdict — read-only aggregate, pinned to the slab's right edge */}
          <div
            style={{
              marginLeft: "auto",
              fontFamily: "var(--faction-snide-font-impact)",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: ACID,
            }}
          >
            {voteCount > 0
              ? t("snide.verdict.closed", {
                  count: submissions.length,
                  top: topScore,
                })
              : t("snide.verdict.none")}
          </div>
        </div>
        <ErrorBanner
          message={signupError}
          style={{
            background: "color-mix(in srgb, var(--faction-snide-pink) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--faction-snide-pink) 30%, transparent)",
          }}
        />

        {/* ── The brief (lined paper) ── */}
        <section>
          <MarkerTab text={t("snide.brief")} rot={-1.5} />
          <div
            style={{
              position: "relative",
              background: PAPER,
              color: INK,
              border: `1.5px solid ${INK}`,
              borderLeft: "4px solid var(--faction-snide)",
              padding: "24px 24px 20px",
              backgroundImage:
                "repeating-linear-gradient(180deg, transparent 0 27px, rgba(20,17,11,0.08) 27px 28px)",
              transform: "rotate(0.3deg)",
              boxShadow: "3px 4px 0 rgba(0,0,0,0.18)",
              maxWidth: 640,
            }}
          >
            <div
              className="snide-tape"
              style={{ top: -9, left: 32, width: 62, height: 18, transform: "rotate(-5deg)" }}
            />
            <p
              style={{
                fontFamily: "var(--faction-snide-font-type)",
                fontSize: 13,
                lineHeight: "28px",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {task.description || t("snide.briefEmpty")}
            </p>
          </div>
        </section>

        {/* ── Accomplices on file ── */}
        {signups.length > 0 && (
          <section>
            <MarkerTab text={t("snide.accomplices")} rot={1} />
            <AccompliceRow signups={signups} friends={friends} foes={foes} />
          </section>
        )}

        {/* ── Cases closed (completed praxis) ── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <MarkerTab
              text={t("snide.casesClosed", { count: submissions.length })}
              rot={1}
            />
            <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
              {(["score", "recent"] as const).map((sort) => {
                const on = submissionSort === sort;
                return (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: "var(--faction-snide-font-cond)",
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "5px 12px",
                      background: on ? INK : "transparent",
                      color: on ? ACID : muted,
                      border: `1.5px solid ${on ? INK : "color-mix(in srgb, var(--faction-snide-wall-text) 30%, transparent)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {sort === "score"
                      ? t("snide.sort.topMarks")
                      : t("snide.sort.recent")}
                  </button>
                );
              })}
            </div>
          </div>

          {sortedSubmissions.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--faction-snide-font-marker)",
                fontSize: 15,
                color: PINK,
              }}
            >
              {t("snide.empty")}
            </p>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 26px", alignItems: "flex-start" }}>
                {sortedSubmissions.slice(0, 4).map((s) => (
                  <div key={s.id} style={{ position: "relative", paddingTop: s.id === topId ? 22 : 0 }}>
                    {s.id === topId && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: "50%",
                          transform: "translateX(-50%) rotate(-3deg)",
                          zIndex: 3,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          whiteSpace: "nowrap",
                          background: PINK,
                          color: "#fff",
                          fontFamily: "var(--faction-snide-font-black)",
                          fontSize: 9,
                          letterSpacing: "0.06em",
                          padding: "4px 12px",
                          boxShadow: `2px 3px 0 ${INK}`,
                        }}
                      >
                        <span style={{ fontSize: 12, lineHeight: 1 }}>⚜</span>{" "}
                        {t("snide.topMarks")}
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
                      fontFamily: "var(--faction-snide-font-marker)",
                      fontSize: 15,
                      color: "var(--faction-snide)",
                      textDecoration: "none",
                    }}
                  >
                    {t("snide.viewAll", { count: submissions.length })}
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
