import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import PraxisCard from "../../../components/PraxisCard";
import { mediaUrl } from "../../../utils/media";
import { ErrorBanner, relationOf } from "./shared";
import type { TaskSignupOut } from "../../../api/tasks";
import type { TaskDetailState } from "../useTaskDetail";

/**
 * The UA task-detail archetype — the GILT SALON: an art-academy "acquisition"
 * voice rendered as a museum acquisition plate. A gold-framed heraldic masthead
 * (burnt amber / cream / gold / brown ink), a matriculation CTA, the commission
 * brief on parchment, the hands matriculated, "The Salon Wall" of filed praxis
 * (the finest hand wears a fleur-de-lis), and a read-only critique aggregate.
 * Ported from the UA design kit (UATaskDetail.tsx); wired to the real
 * {@link TaskDetailState}.
 *
 * UA is ALWAYS-LIGHT — its --faction-ua-* / --ua-* tokens are identical in both
 * themes, so the salon never dims and we never mutate the document theme. The
 * kit's top <nav> and critique/comment thread are dropped (TaskDetail.tsx renders
 * the breadcrumb context and CommentThread). Every raw hex from the kit is mapped
 * onto the existing UA CSS vars in index.css.
 */

const INK = "var(--ua-ink)";
const SUB = "var(--ua-sub)";
const MUTED = "var(--ua-muted)";
const ORANGE = "var(--ua-orange)";
const ORANGE_DEEP = "var(--ua-orange-deep)";
const GOLD = "var(--ua-gold)";
const GOLD_PALE = "var(--ua-gold-pale)";
const PAPER = "var(--ua-paper)";
const PAPER_WARM = "var(--ua-paper-warm)";
const LINE = "var(--ua-line)";
const GILT = "var(--ua-gilt)";

/** Roman numeral for the salon's "ANNO" (level) label. */
function romanLevel(n: number): string {
  return (
    ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][
      Math.max(0, Math.min(9, n - 1))
    ] ?? String(n)
  );
}

/** The UA heraldic crest — a shield, sun, and crossed brushes. */
function CrestShield({ size = 150 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <clipPath id="ua-det-shield">
          <path d="M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#ua-det-shield)">
        <rect x="0" y="0" width="100" height="120" fill={ORANGE} />
        <rect
          x="0"
          y="60"
          width="100"
          height="60"
          fill="color-mix(in srgb, var(--ua-gold-pale) 55%, var(--ua-paper))"
        />
        <circle cx="50" cy="60" r="15" fill={GOLD_PALE} />
        <g stroke={GOLD_PALE} strokeWidth="2.4" strokeLinecap="round">
          <line x1="50" y1="60" x2="50" y2="20" />
          <line x1="50" y1="60" x2="22" y2="30" />
          <line x1="50" y1="60" x2="78" y2="30" />
          <line x1="50" y1="60" x2="14" y2="48" />
          <line x1="50" y1="60" x2="86" y2="48" />
          <line x1="50" y1="60" x2="34" y2="22" />
          <line x1="50" y1="60" x2="66" y2="22" />
        </g>
        <g transform="translate(50 84)">
          <g transform="rotate(38)">
            <rect x="-2" y="-30" width="4" height="44" rx="1.5" fill={INK} />
            <rect x="-3" y="10" width="6" height="6" fill={GOLD_PALE} />
            <path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill={ORANGE} />
          </g>
          <g transform="rotate(-38)">
            <rect x="-2" y="-30" width="4" height="44" rx="1.5" fill={GOLD} />
            <rect x="-3" y="10" width="6" height="6" fill={GOLD_PALE} />
            <path d="M-3 16 L3 16 L1.5 26 L-1.5 26 Z" fill="var(--ua-gold-lt)" />
          </g>
        </g>
      </g>
      <path
        d="M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z"
        fill="none"
        stroke="var(--ua-gold-lt)"
        strokeWidth="2.5"
      />
      <path
        d="M8 6 H92 V60 C92 92 66 108 50 116 C34 108 8 92 8 60 Z"
        fill="none"
        stroke={INK}
        strokeWidth="0.8"
      />
    </svg>
  );
}

const sectionRule: CSSProperties = {
  flex: 1,
  height: 1,
  background: `linear-gradient(90deg, ${LINE}, transparent)`,
};
const sectionH2: CSSProperties = {
  fontFamily: "var(--ua-engraved)",
  fontSize: 18,
  letterSpacing: "0.06em",
  margin: 0,
  color: INK,
  whiteSpace: "nowrap",
};

/** Section header — engraved-caps heading with a fading gold rule. */
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

/** Hands matriculated — real signup avatars with friend/foe dots. */
function HandsRow({
  signups,
  friends,
  foes,
}: {
  signups: TaskSignupOut[];
  friends: Set<number>;
  foes: Set<number>;
}) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
    >
      {signups.map((hand) => {
        const rel = relationOf(hand.character_id, friends, foes);
        const relColor = rel === "friend" ? GOLD : ORANGE;
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
                  border: `2px solid ${GOLD}`,
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
                  color: GOLD_PALE,
                  fontFamily: "var(--ua-display)",
                  fontStyle: "italic",
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
                  border: `2px solid ${PAPER_WARM}`,
                }}
              />
            )}
          </Link>
        );
      })}
      <span
        style={{
          fontFamily: "var(--ua-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: MUTED,
          marginLeft: 4,
        }}
      >
        matriculated
      </span>
    </div>
  );
}

/** An acquisition stat plate — engraved label over a didone value. */
function StatPlate({
  label,
  children,
  accent = false,
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "9px 16px",
        border: `1px solid ${accent ? ORANGE : LINE}`,
        background: accent ? ORANGE : PAPER,
      }}
    >
      <span
        style={{
          fontFamily: "var(--ua-engraved)",
          fontSize: 8,
          letterSpacing: "0.14em",
          color: accent ? "var(--ua-paper-warm)" : MUTED,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--ua-display)",
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 24,
          lineHeight: 0.9,
          color: accent ? PAPER_WARM : INK,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default function TaskDetailUA({
  state,
}: {
  state: TaskDetailState;
}) {
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
    avgVoteNumber,
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

  // Status in the salon's voice: active reads as an open salon "on view".
  const statusVoice =
    task.status === "active" ? "On View · Open Salon" : task.status;

  // Decorative: the salon's "commission №" — derived from the real task id.
  const commissionNo = String(task.id).padStart(4, "0");

  // The finest hand on the Salon Wall wears the ⚜ fleur-de-lis.
  const topId = submissions.length
    ? submissions.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)).id
    : null;

  return (
    <div
      className="py-8"
      style={{ fontFamily: "var(--ua-mono)", color: INK }}
    >
      {/* ── Breadcrumb ── */}
      <nav
        className="mb-4"
        style={{
          fontFamily: "var(--ua-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: MUTED,
        }}
      >
        <Link to="/tasks" style={{ color: ORANGE, textDecoration: "none" }}>
          Tasks
        </Link>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span style={{ fontFamily: "var(--ua-engraved)" }}>UA</span>
        <span style={{ opacity: 0.5, margin: "0 8px" }}>›</span>
        <span style={{ color: ORANGE }}>{task.title}</span>
      </nav>

      <div style={{ maxWidth: 920 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {/* ── HERO — gilt salon acquisition plate ── */}
          <div
            style={{
              padding: 11,
              background: GILT,
              boxShadow:
                "0 18px 40px rgba(60,40,10,0.28), inset 0 0 0 1px rgba(255,255,255,0.45)",
            }}
          >
            <div
              style={{
                padding: 5,
                background: `linear-gradient(135deg, ${GOLD}, ${GOLD_PALE})`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  border: "1px solid color-mix(in srgb, var(--ua-ink) 45%, transparent)",
                  background: PAPER_WARM,
                  backgroundImage:
                    "radial-gradient(color-mix(in srgb, var(--ua-ink) 3%, transparent) 1px, transparent 1px)",
                  backgroundSize: "5px 5px",
                  padding: "34px 38px 30px",
                  display: "flex",
                  gap: 30,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <CrestShield size={150} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div
                    style={{
                      fontFamily: "var(--ua-engraved)",
                      fontSize: 11,
                      letterSpacing: "0.16em",
                      color: ORANGE,
                      marginBottom: 3,
                    }}
                  >
                    University of Asthmatics
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--ua-mono)",
                      fontSize: 8,
                      letterSpacing: "0.3em",
                      color: MUTED,
                      marginBottom: 14,
                    }}
                  >
                    COMMISSION №{commissionNo} · EST · MMXX
                  </div>
                  <h1
                    style={{
                      fontFamily: "var(--ua-display)",
                      fontStyle: "italic",
                      fontWeight: 700,
                      fontSize: 42,
                      lineHeight: 1.06,
                      color: INK,
                      margin: "0 0 16px",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {task.title}
                  </h1>
                  <div
                    style={{
                      position: "relative",
                      width: "fit-content",
                      background: ORANGE,
                      color: "var(--faction-ua-light)",
                      fontFamily: "var(--ua-engraved)",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      padding: "5px 24px",
                      clipPath:
                        "polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)",
                      marginBottom: 18,
                    }}
                  >
                    <span style={{ color: PAPER_WARM }}>{statusVoice}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <StatPlate label="ANNO">{romanLevel(task.level_required)}</StatPlate>
                    <StatPlate label="HONORARIA" accent>
                      {modifiedPoints}
                      <span
                        style={{
                          fontFamily: "var(--ua-engraved)",
                          fontSize: 9,
                          marginLeft: 4,
                          fontStyle: "normal",
                          fontWeight: 400,
                        }}
                      >
                        pts
                      </span>
                    </StatPlate>
                    <StatPlate label="ON VIEW">
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 18,
                          lineHeight: 1.2,
                          color: SUB,
                        }}
                      >
                        {signups.length} sitting · {submissions.length} hung
                      </span>
                    </StatPlate>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Matriculation CTA / signed-on states ── */}
          {canSignUp && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
                padding: "16px 20px",
                border: `1px solid ${LINE}`,
                background: PAPER,
              }}
            >
              <button
                onClick={handleSignup}
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--ua-engraved)",
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  color: PAPER_WARM,
                  background: ORANGE,
                  border: "none",
                  padding: "13px 26px",
                  boxShadow: "0 3px 8px rgba(194,84,31,0.3)",
                }}
              >
                Matriculate ▸ earn up to {modifiedPoints} pts
              </button>
              <div
                style={{
                  fontFamily: "var(--ua-serif)",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: SUB,
                }}
              >
                {slotsOpen} of {maxTaskSlots} easels reserved · Anno{" "}
                {romanLevel(task.level_required)} standing met
              </div>
              <ErrorBanner
                message={signupError}
                style={{
                  flexBasis: "100%",
                  marginTop: 0,
                  background: "var(--faction-ua-light)",
                  border: `1px solid ${ORANGE}`,
                  color: ORANGE_DEEP,
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
                padding: "16px 20px",
                border: `1px solid ${LINE}`,
                background: PAPER,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--ua-engraved)",
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  color: GOLD,
                }}
              >
                ✦ Your work hangs on the Salon Wall
              </span>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--ua-engraved)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  padding: "10px 20px",
                  background: INK,
                  color: PAPER_WARM,
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
                padding: "16px 20px",
                border: `1px solid ${LINE}`,
                background: PAPER,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--ua-engraved)",
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  color: ORANGE,
                }}
              >
                Your easel is at the salon
              </span>
              <Link
                to={`/praxes/${inProgressPraxisId}/edit`}
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--ua-engraved)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  padding: "10px 20px",
                  background: ORANGE,
                  color: PAPER_WARM,
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
                  fontFamily: "var(--ua-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: MUTED,
                }}
              >
                drop
              </button>
              <ErrorBanner
                message={signupError}
                style={{
                  flexBasis: "100%",
                  marginTop: 0,
                  background: "var(--faction-ua-light)",
                  border: `1px solid ${ORANGE}`,
                  color: ORANGE_DEEP,
                }}
              />
            </div>
          )}

          {/* ── The Commission — the user-written brief ── */}
          <section>
            <SectionHead title="The Commission" />
            <div
              style={{
                border: `1px solid ${LINE}`,
                background: PAPER,
                padding: "28px 32px",
                maxWidth: 660,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--ua-serif)",
                  fontSize: 17,
                  lineHeight: 1.75,
                  color: SUB,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description ||
                  "No commission posted yet. The Salon awaits its brief — render the light before it leaves and pin your work to the wall."}
              </p>
            </div>
          </section>

          {/* ── Hands matriculated ── */}
          {signups.length > 0 && (
            <section>
              <SectionHead title="Matriculated" />
              <HandsRow signups={signups} friends={friends} foes={foes} />
            </section>
          )}

          {/* ── The Critique — read-only aggregate verdict ── */}
          <section>
            <SectionHead title="The Critique" />
            {voteCount > 0 ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "var(--ua-display)",
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: 54,
                    lineHeight: 0.8,
                    color: ORANGE,
                  }}
                >
                  {avgVoteNumber.toFixed(1)}
                </span>
                <div style={{ paddingBottom: 6 }}>
                  <div
                    style={{
                      fontFamily: "var(--ua-engraved)",
                      fontSize: 14,
                      letterSpacing: "0.06em",
                      color: INK,
                    }}
                  >
                    Average Critique
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--ua-mono)",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      color: MUTED,
                    }}
                  >
                    {voteCount} work{voteCount === 1 ? "" : "s"} appraised
                  </div>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontFamily: "var(--ua-serif)",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: SUB,
                }}
              >
                The Salon has rendered no verdict yet. Be the first hand to hang a
                work.
              </p>
            )}
          </section>

          {/* ── The Salon Wall — filed praxis (completions) ── */}
          <section>
            <SectionHead
              title="The Salon Wall"
              trailing={
                <div style={{ display: "flex", gap: 0 }}>
                  {(["score", "recent"] as const).map((sort) => {
                    const on = submissionSort === sort;
                    return (
                      <button
                        key={sort}
                        onClick={() => setSubmissionSort(sort)}
                        style={{
                          fontFamily: "var(--ua-engraved)",
                          fontSize: 10,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "5px 12px",
                          background: on ? INK : "transparent",
                          color: on ? PAPER_WARM : MUTED,
                          border: `1px solid ${
                            on
                              ? INK
                              : "color-mix(in srgb, var(--ua-ink) 30%, transparent)"
                          }`,
                          cursor: "pointer",
                        }}
                      >
                        {sort === "score" ? "Finest" : "recent"}
                      </button>
                    );
                  })}
                </div>
              }
            />
            {sortedSubmissions.length === 0 ? (
              <p
                style={{
                  fontFamily: "var(--ua-serif)",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: SUB,
                }}
              >
                The wall is bare. Be the first hand to file a work against this
                commission.
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "30px 22px",
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
                            background: ORANGE,
                            color: PAPER_WARM,
                            fontFamily: "var(--ua-engraved)",
                            fontSize: 9,
                            letterSpacing: "0.12em",
                            padding: "4px 12px",
                            boxShadow: "0 3px 8px rgba(60,40,10,0.3)",
                          }}
                        >
                          <span style={{ fontSize: 13, lineHeight: 1 }}>⚜</span>{" "}
                          FINEST HAND
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
                        fontFamily: "var(--ua-engraved)",
                        fontSize: 13,
                        letterSpacing: "0.06em",
                        color: ORANGE,
                        textDecoration: "none",
                      }}
                    >
                      View all {submissions.length} works &rarr;
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
