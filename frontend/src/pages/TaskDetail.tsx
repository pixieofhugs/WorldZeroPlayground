import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  getTask,
  getTaskSignups,
  type TaskOut,
  type TaskSignupOut,
} from "../api/tasks";
import {
  listPraxes,
  createPraxis,
  withdrawPraxis,
  type PraxisCardOut,
} from "../api/praxis";
import { listRelationships } from "../api/relationships";
import PraxisCard from "../components/PraxisCard";
import LevelPill from "../components/ui/LevelPill";
import PageTitle from "../components/ui/PageTitle";
import FeedBadge from "../components/feed/FeedBadge";
import { useAuth } from "../auth/AuthContext";
import {
  factionCssVar,
  factionName,
  getFactionTokens,
} from "../utils/factions";
import { extractError } from "../utils/errors";
import { mediaUrl } from "../utils/media";
import { computeDisplayPoints } from "../utils/points";
import { useGameConfig } from "../hooks/useGameConfig";

const DEFAULT_MAX_TASK_SLOTS = 20;
const VISIBLE_SIGNUPS = 4;

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [task, setTask] = useState<TaskOut | null>(null);
  const [submissions, setSubmissions] = useState<PraxisCardOut[]>([]);
  const [signups, setSignups] = useState<TaskSignupOut[]>([]);
  const [isInProgress, setIsInProgress] = useState(false);
  const [inProgressPraxisId, setInProgressPraxisId] = useState<number | null>(
    null,
  );
  const [taskSlotCount, setTaskSlotCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Friend/foe lookup sets
  const [friends, setFriends] = useState<Set<number>>(new Set());
  const [foes, setFoes] = useState<Set<number>>(new Set());

  // Game config
  const gameConfig = useGameConfig();
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS;

  // Submission sort
  const [submissionSort, setSubmissionSort] = useState<"score" | "recent">(
    "score",
  );

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setIsInProgress(false);
    const taskId = parseInt(id, 10);

    const fetches: Promise<unknown>[] = [
      getTask(taskId),
      listPraxes({ task_id: taskId, status: "submitted" }),
      getTaskSignups(taskId),
    ];
    if (user) {
      fetches.push(
        listPraxes({ character_id: user.character?.id, status: "in_progress" }),
      );
      fetches.push(
        listRelationships({ type: "friend" })
          .then(
            (rels) =>
              new Set(
                rels
                  .filter((r) => r.status === "active")
                  .map((r) => r.to_character_id),
              ),
          )
          .catch(() => new Set<number>()),
      );
      fetches.push(
        listRelationships({ type: "foe" })
          .then(
            (rels) =>
              new Set(
                rels
                  .filter((r) => r.status === "active")
                  .map((r) => r.to_character_id),
              ),
          )
          .catch(() => new Set<number>()),
      );
    }

    Promise.all(fetches)
      .then(([t, s, sg, myTasks, friendSet, foeSet]) => {
        setTask(t as TaskOut);
        setSubmissions(s as PraxisCardOut[]);
        setSignups(sg as TaskSignupOut[]);
        if (myTasks) {
          const praxes = myTasks as PraxisCardOut[];
          const activeForThisTask = praxes.find(
            (p) => p.task_id === taskId && !p.is_withdrawn,
          );
          setIsInProgress(activeForThisTask !== undefined);
          setInProgressPraxisId(activeForThisTask?.id ?? null);
          setTaskSlotCount(praxes.filter((p) => !p.is_withdrawn).length);
        }
        if (friendSet) setFriends(friendSet as Set<number>);
        if (foeSet) setFoes(foeSet as Set<number>);
      })
      .catch((err) =>
        setFetchError(extractError(err, "Couldn't load this task.")),
      )
      .finally(() => setLoading(false));
  }, [id, location.key]);

  const mySubmission = user?.character
    ? submissions.find(
        (s) => s.created_by_id === user.character!.id && !s.is_withdrawn,
      )
    : undefined;

  const handleSignup = async () => {
    if (!task) return;
    setSignupError(null);
    try {
      const praxis = await createPraxis({ task_id: task.id, type: "solo" });
      navigate(`/praxes/${praxis.id}/edit`);
    } catch (err) {
      setSignupError(extractError(err, "Could not sign up for this task."));
    }
  };

  const handleDrop = async () => {
    if (!task) return;
    // Drop either the submitted praxis (if any) or the in-progress draft.
    const targetPraxisId = mySubmission?.id ?? inProgressPraxisId;
    if (!targetPraxisId) return;
    if (!window.confirm("Drop this task? You can sign up again later.")) return;
    setSignupError(null);
    try {
      await withdrawPraxis(targetPraxisId);
      setIsInProgress(false);
      setInProgressPraxisId(null);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === targetPraxisId ? { ...s, is_withdrawn: true } : s,
        ),
      );
    } catch (err) {
      setSignupError(extractError(err, "Could not drop this task."));
    }
  };

  if (loading)
    return <div className="py-8 font-body text-muted">Loading...</div>;
  if (fetchError)
    return (
      <div className="py-8">
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{" "}
          <button
            onClick={() => window.location.reload()}
            className="underline"
          >
            Try refreshing.
          </button>
        </p>
      </div>
    );
  if (!task)
    return <div className="py-8 font-body text-muted">Task not found.</div>;

  const slug = task.primary_faction_slug;
  const {
    primary: color,
    surface: heroSurface,
    text: heroInk,
    muted: heroMuted,
    accent: heroAccent,
    font: heroFont,
  } = getFactionTokens(slug);
  const fname = factionName(slug);
  // Backend-authoritative: `can_submit_praxis` covers level, faction gate,
  // one-per-task rule, and Analog carve-out. Keep local `mySubmission`/
  // `isInProgress` checks so we show the right UI state (edit / in-progress)
  // instead of the sign-up button.
  const canSignUp =
    !!user && !mySubmission && !isInProgress && task.can_submit_praxis;
  const slotsOpen = maxTaskSlots - taskSlotCount;
  const avgVote =
    submissions.length > 0
      ? (
          submissions.reduce((sum, s) => sum + (s.score ?? 0), 0) /
          submissions.length
        ).toFixed(1)
      : "—";

  const myFaction = user?.character?.faction_slug;
  const taskFaction = task.primary_faction_slug;
  const factionConfig =
    myFaction && gameConfig
      ? gameConfig.factions.find((f) => f.slug === myFaction)
      : null;
  const factionMultiplier = factionConfig
    ? !taskFaction || taskFaction === myFaction || taskFaction === "na"
      ? factionConfig.own_task_modifier
      : factionConfig.other_task_modifier
    : 1.0;
  const modifiedPoints = gameConfig
    ? computeDisplayPoints(
        task.point_value,
        myFaction,
        taskFaction,
        gameConfig.factions,
      )
    : task.point_value;

  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (submissionSort === "score") return (b.score ?? 0) - (a.score ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="py-8">
      {/* ── Breadcrumb ── */}
      <PageTitle title="Task" eyebrow="Tasks · Detail" />
      <nav
        className="font-body mb-4"
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "var(--color-text-tertiary)",
        }}
      >
        <Link
          to="/tasks"
          style={{ color: "var(--faction-journeymen)", textDecoration: "none" }}
        >
          Tasks
        </Link>
        {" › "}
        <span style={{ color: "var(--color-text-primary)" }}>{task.title}</span>
      </nav>

      {/* ── Two-Column Layout ── */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* ── Main Column ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ── Task Hero Block ── */}
          <div
            className="mb-5"
            style={{
              background: heroSurface,
              color: heroInk,
              fontFamily: heroFont,
              borderTop: "1px solid var(--color-border)",
              borderRight: "1px solid var(--color-border)",
              borderBottom: "1px solid var(--color-border)",
              borderLeft: `4px solid ${color}`,
              padding: "18px 22px",
              boxShadow: "0 0 0 1px rgba(0,0,0,.04)",
            }}
          >
            {/* Faction pennant + status + level */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span
                className="pennant-shape"
                style={{
                  display: "inline-block",
                  background: color,
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  padding: "3px 14px",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                {fname}
              </span>
              <span
                className="font-body"
                style={{
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  padding: "2px 8px",
                  borderRadius: 4,
                  background:
                    task.status === "active"
                      ? "var(--faction-analog-light)"
                      : "var(--color-bg-surface-alt)",
                  color:
                    task.status === "active"
                      ? "var(--faction-analog)"
                      : "var(--color-text-tertiary)",
                }}
              >
                {task.status}
              </span>
              {task.task_type === "metatask" && (
                <span
                  className="font-body"
                  style={{
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: factionCssVar(task.metatask_faction_slug),
                    color: "var(--color-text-on-accent)",
                    fontWeight: 700,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  META
                </span>
              )}
              <LevelPill level={task.level_required} />
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: heroFont,
                fontSize: 28,
                fontWeight: 600,
                color: heroInk,
                lineHeight: 1.2,
                marginBottom: task.task_type === "metatask" ? 4 : 12,
              }}
            >
              {task.title}
            </h1>

            {/* Metatask-for line */}
            {task.task_type === "metatask" && (
              <p
                className="eyebrow"
                style={{
                  marginBottom: 12,
                  color: factionCssVar(task.metatask_faction_slug),
                }}
              >
                Metatask for {factionName(task.metatask_faction_slug)}
              </p>
            )}

            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${user && factionMultiplier !== 1.0 ? 5 : 4}, 1fr)`,
                gap: 8,
                marginBottom: 16,
              }}
            >
              {[
                { label: "Base Pts", value: task.point_value },
                ...(user && factionMultiplier !== 1.0
                  ? [
                      {
                        label: `Your Pts (×${factionMultiplier})`,
                        value: modifiedPoints,
                      },
                    ]
                  : []),
                { label: "Completed", value: submissions.length },
                { label: "In Progress", value: signups.length },
                { label: "Avg Vote", value: avgVote },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center py-2"
                  style={{
                    border: `1px solid ${heroAccent}`,
                    background: "transparent",
                  }}
                >
                  <div
                    className="font-body font-bold text-lg"
                    style={{ color: heroInk }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="eyebrow"
                    style={{ fontSize: 7, color: heroAccent }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            {task.description && (
              <p
                className="font-body"
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: heroMuted,
                  whiteSpace: "pre-wrap",
                }}
              >
                {task.description}
              </p>
            )}
          </div>

          {/* ── Signup Block ── */}
          {canSignUp && (
            <div className="sidebar-card mb-5" style={{ padding: "16px 20px" }}>
              <button
                onClick={handleSignup}
                style={{
                  width: "100%",
                  background: color,
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  padding: "10px 20px",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 3,
                    border: "1px dashed rgba(255,255,255,0.25)",
                    pointerEvents: "none",
                  }}
                />
                Sign up · earn up to {modifiedPoints} pts
              </button>

              <div
                className="eyebrow"
                style={{
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  You have {slotsOpen} of {maxTaskSlots} task slots open
                </span>
                <span>
                  Level {task.level_required} required{" "}
                  <span className="eyebrow">MET</span>
                </span>
              </div>

              {signupError && (
                <div
                  className="font-body"
                  style={{
                    fontSize: 11,
                    color: "var(--color-danger)",
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "rgba(220,38,38,0.06)",
                    border: "1px solid rgba(220,38,38,0.2)",
                  }}
                >
                  {signupError}
                </div>
              )}
            </div>
          )}

          {/* Already signed up / submitted states */}
          {user && mySubmission && (
            <div
              className="sidebar-card mb-5"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  background: factionCssVar(task.primary_faction_slug, "light"),
                  border: `1.5px solid ${factionCssVar(task.primary_faction_slug, "border")}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flex: 1,
                }}
              >
                <span className="eyebrow" style={{ color }}>
                  DONE
                </span>
                <span
                  className="font-body"
                  style={{ fontSize: 11, color: "var(--color-text-primary)" }}
                >
                  You've submitted praxis for this task
                </span>
              </div>
              <Link
                to={`/praxes/${mySubmission.id}/edit`}
                className="btn-outline"
                style={{ fontSize: 8, padding: "4px 12px" }}
              >
                edit
              </Link>
            </div>
          )}

          {user &&
            !mySubmission &&
            isInProgress &&
            inProgressPraxisId !== null && (
              <div
                className="sidebar-card mb-5"
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    background: factionCssVar(
                      task.primary_faction_slug,
                      "light",
                    ),
                    border: `1.5px solid ${factionCssVar(task.primary_faction_slug, "border")}`,
                    borderRadius: 8,
                    padding: "8px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <span className="eyebrow" style={{ color }}>
                    IN PROGRESS
                  </span>
                  <span
                    className="font-body"
                    style={{ fontSize: 11, color: "var(--color-text-primary)" }}
                  >
                    You're on this task
                  </span>
                </div>
                <Link
                  to={`/praxes/${inProgressPraxisId}/edit`}
                  style={{
                    background: color,
                    color: "var(--color-text-on-accent)",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    padding: "8px 18px",
                    textDecoration: "none",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: 3,
                      border: "1px dashed rgba(255,255,255,0.25)",
                      pointerEvents: "none",
                    }}
                  />
                  Continue editing
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
                  drop
                </button>
              </div>
            )}

          {/* ── Completed Praxis Section ── */}
          <div className="mt-2">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <span className="eyebrow">
                {submissions.length} Completed Praxis
              </span>
              <div style={{ display: "flex", gap: 0 }}>
                {(["score", "recent"] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      padding: "4px 10px",
                      background:
                        submissionSort === sort
                          ? "var(--color-text-primary)"
                          : "transparent",
                      color:
                        submissionSort === sort
                          ? "var(--color-bg-page)"
                          : "var(--color-text-tertiary)",
                      border: `1px solid ${submissionSort === sort ? "transparent" : "var(--color-border)"}`,
                      cursor: "pointer",
                    }}
                  >
                    {sort === "score" ? "Top Rated" : "Recent"}
                  </button>
                ))}
              </div>
            </div>

            {sortedSubmissions.length === 0 ? (
              <p className="font-body text-muted">
                No submissions yet. Be the first.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 items-start">
                  {sortedSubmissions.slice(0, 4).map((s) => (
                    <PraxisCard key={s.id} praxis={s} />
                  ))}
                </div>
                {submissions.length > 4 && (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <Link
                      to={`/praxes?task_id=${task.id}`}
                      style={{
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "var(--faction-journeymen)",
                        textDecoration: "none",
                      }}
                    >
                      View all {submissions.length} praxis &rarr;
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Sidebar Column ── */}
        <div style={{ width: 240, flexShrink: 0 }}>
          {/* Players in Progress */}
          <div className="sidebar-card mb-3">
            <p className="eyebrow mb-2">{signups.length} Players in Progress</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {signups.slice(0, VISIBLE_SIGNUPS).map((signup) => {
                const isFriend = friends.has(signup.character_id);
                const isFoe = foes.has(signup.character_id);
                return (
                  <div
                    key={signup.character_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 0",
                    }}
                  >
                    <Link to={`/characters/${signup.character_id}`}>
                      {signup.avatar_url ? (
                        <img
                          src={mediaUrl(signup.avatar_url)}
                          alt={signup.display_name}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 24,
                            height: 24,
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
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                        textDecoration: "none",
                        flex: 1,
                      }}
                    >
                      {signup.display_name}
                    </Link>
                    {isFriend && <FeedBadge type="friend" label="Friend" />}
                    {isFoe && <FeedBadge type="duel" label="Foe" />}
                  </div>
                );
              })}
            </div>
            {signups.length > VISIBLE_SIGNUPS && (
              <p
                className="eyebrow"
                style={{ marginTop: 6, color: "var(--color-text-tertiary)" }}
              >
                +{signups.length - VISIBLE_SIGNUPS} more &rarr;
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
