/**
 * useTaskDetail — extracts every piece of state and async behaviour from the
 * legacy TaskDetail.tsx so that per-faction archetypes can each own their own
 * visual treatment without re-implementing the data plumbing.
 *
 * Behaviour preserved 1:1 from the original page (location.key refetch, the
 * conditional friend/foe Promise.all, signup → navigate-to-edit, drop/withdraw
 * with optimistic update, score/recent sort). The returned `TaskDetailState` is
 * the stable contract every task-detail archetype consumes.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getTask,
  getTaskSignups,
  type TaskOut,
  type TaskSignupOut,
} from "../../api/tasks";
import {
  listPraxes,
  createPraxis,
  deletePraxis,
  type PraxisCardOut,
} from "../../api/praxis";
import { listRelationships } from "../../api/relationships";
import { useAuth } from "../../auth/AuthContext";
import { extractError } from "../../utils/errors";
import { computeDisplayPoints, computeFactionMultiplier } from "../../utils/points";
import { useGameConfig } from "../../hooks/useGameConfig";
import { isLevelJumpSignup } from "./levelJump";

const DEFAULT_MAX_TASK_SLOTS = 20;

export interface TaskDetailState {
  // Routing / loading
  loading: boolean;
  task: TaskOut | null;
  fetchError: string | null;

  // Entities
  submissions: PraxisCardOut[];
  signups: TaskSignupOut[];
  friends: Set<number>;
  foes: Set<number>;

  // My relationship to this task
  mySubmission: PraxisCardOut | undefined;
  isInProgress: boolean;
  inProgressPraxisId: number | null;

  // Derived gameplay numbers
  canSignUp: boolean;
  // True when the sign-up CTA is only reachable because of the viewer's faction
  // level-jump allowance (#811/#816): the task sits above the viewer's level but
  // within `level_jump_reach`, the allowance is unspent, and the backend already
  // says they may sign up. Drives a distinct "level-jump" affordance so an
  // above-level task that IS reachable never looks identical to one that is out
  // of reach. Config-backed — no `slug === 'wow'` branch (a second faction could
  // gain the ability). When it goes false (spent, or plainly out of reach) the
  // CTA simply doesn't render, so an above-level task reads as locked.
  levelJumpSignup: boolean;
  slotsOpen: number;
  maxTaskSlots: number;
  /**
   * The task's unmultiplied point value (`task.point_value`), 0 when no task is
   * loaded. Task-detail skins draw this beside {@link factionMultiplier} as two
   * legible pieces rather than one pre-multiplied number — the same contract
   * ADR-0055 set for task cards, extended to task detail by #1030.
   */
  basePoints: number;
  /**
   * The RAW per-faction task modifier for the viewer (`own_task_modifier` /
   * `other_task_modifier`), straight from `computeFactionMultiplier`. Never a
   * reconstructed `modifiedPoints / basePoints` ratio — that reconstruction is
   * the dead-arithmetic trap ADR-0053 named. `era_1` neutralises every faction
   * to 1.0, so `isNeutralMultiplier(factionMultiplier)` is true everywhere
   * today and the `×n` badge is correctly invisible.
   */
  factionMultiplier: number;
  /**
   * Base × multiplier, rounded. Legacy single-number readout kept for the
   * faction archetypes that have not yet moved to base + badge (C1–C8,
   * #1031–#1038); it drops out of the contract once they have.
   */
  modifiedPoints: number;
  /**
   * Characters actively working this task (`in_progress_count`, #1021), with
   * the optional-field default applied once here rather than in nine skins.
   * This is the ONLY place the in-progress population appears on task detail —
   * no skin renders a roster (owner ruling 2026-07-28, reversing epic #1028
   * decision 3).
   */
  inProgressCount: number;
  topScore: number; // highest submission merit — non-mean signal (ADR-0014; no averages)
  voteCount: number;

  // Submission sort (shared so every archetype gets the same toggle)
  submissionSort: "score" | "recent";
  setSubmissionSort: (sort: "score" | "recent") => void;
  sortedSubmissions: PraxisCardOut[];

  // Handlers
  signupError: string | null;
  handleSignup: () => Promise<void>;
  handleDrop: () => Promise<void>;
}

export function useTaskDetail(idParam: string | undefined): TaskDetailState {
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
    if (!idParam) return;
    setLoading(true);
    setIsInProgress(false);
    const taskId = parseInt(idParam, 10);

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
            (p) => p.task_id === taskId,
          );
          setIsInProgress(activeForThisTask !== undefined);
          setInProgressPraxisId(activeForThisTask?.id ?? null);
          setTaskSlotCount(praxes.length);
        }
        if (friendSet) setFriends(friendSet as Set<number>);
        if (foeSet) setFoes(foeSet as Set<number>);
      })
      .catch((err) =>
        setFetchError(extractError(err, "Couldn't load this task.")),
      )
      .finally(() => setLoading(false));
    // Depend on the character id, not the whole `user` object: refetch when the
    // viewer logs in/out or switches character, but not on every auth-object
    // identity change (e.g. an unrelated refetch()), which would flash "Loading…".
  }, [idParam, location.key, user?.character?.id]);

  const mySubmission = user?.character
    ? submissions.find(
        (s) => s.created_by_id === user.character!.id,
      )
    : undefined;

  const handleSignup = useCallback(async () => {
    if (!task) return;
    setSignupError(null);
    try {
      const praxis = await createPraxis({ task_id: task.id, type: "solo" });
      navigate(`/praxes/${praxis.id}/edit`);
    } catch (err) {
      setSignupError(extractError(err, "Could not sign up for this task."));
    }
  }, [task, navigate]);

  const handleDrop = useCallback(async () => {
    if (!task) return;
    // Drop either the submitted praxis (if any) or the in-progress draft.
    const targetPraxisId = mySubmission?.id ?? inProgressPraxisId;
    if (!targetPraxisId) return;
    if (!window.confirm("Drop this task? You can sign up again later.")) return;
    setSignupError(null);
    try {
      await deletePraxis(targetPraxisId);
      setIsInProgress(false);
      setInProgressPraxisId(null);
      setSubmissions((prev) => prev.filter((s) => s.id !== targetPraxisId));
      // `canSignUp` gates on `task.can_submit_praxis`, which the SERVER computes
      // and flips to false once you are on the task. Clearing local state alone
      // leaves that stale `false` in place, so the sign-up button stayed hidden
      // until a manual reload. Re-read the task — it also refreshes
      // `in_progress_count`, which just went down by one.
      try {
        setTask((await getTask(task.id)) as TaskOut);
      } catch {
        // The drop itself succeeded; a failed re-read is not worth an error
        // banner. The stale flag clears on the next navigation.
      }
    } catch (err) {
      setSignupError(extractError(err, "Could not drop this task."));
    }
  }, [task, mySubmission, inProgressPraxisId]);

  // ── Derived gameplay numbers (null-safe — run every render) ──
  const myFaction = user?.character?.faction_slug ?? null;
  const taskFaction = task?.primary_faction_slug ?? null;
  // One resolver, shared with the task cards — a second hand-rolled copy of the
  // own/other branch is exactly how the two surfaces would drift apart.
  const factionMultiplier = gameConfig
    ? computeFactionMultiplier(myFaction, taskFaction, gameConfig.factions)
    : 1.0;
  const basePoints = task?.point_value ?? 0;
  const inProgressCount = task?.in_progress_count ?? 0;
  const modifiedPoints =
    task && gameConfig
      ? computeDisplayPoints(
          task.point_value,
          myFaction,
          taskFaction,
          gameConfig.factions,
        )
      : (task?.point_value ?? 0);

  const canSignUp =
    !!user && !mySubmission && !isInProgress && !!task?.can_submit_praxis;
  // The signable task is a level-jump iff the viewer's faction grants reach, the
  // allowance is unspent, and the task sits above the viewer's own level. Logic
  // lives in the pure `isLevelJumpSignup` predicate so it is testable props-in/
  // value-out. We do NOT recompute eligibility — canSignUp already trusts the
  // backend's `can_submit_praxis`.
  const levelJumpSignup = isLevelJumpSignup({
    canSignUp,
    levelJumpReach: user?.level_jump_reach ?? 0,
    levelJumpAvailable: !!user?.level_jump_available,
    taskLevelRequired: task?.level_required,
    viewerLevel: user?.character?.level ?? 0,
  });
  const slotsOpen = maxTaskSlots - taskSlotCount;

  const voteCount = submissions.length;
  // ADR-0014 forbids vote averages; expose the highest submission merit instead.
  const topScore = submissions.reduce(
    (max, s) => Math.max(max, s.score ?? 0),
    0,
  );

  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      if (submissionSort === "score") return (b.score ?? 0) - (a.score ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [submissions, submissionSort]);

  return {
    loading,
    task,
    fetchError,

    submissions,
    signups,
    friends,
    foes,

    mySubmission,
    isInProgress,
    inProgressPraxisId,

    canSignUp,
    levelJumpSignup,
    slotsOpen,
    maxTaskSlots,
    basePoints,
    factionMultiplier,
    modifiedPoints,
    inProgressCount,
    topScore,
    voteCount,

    submissionSort,
    setSubmissionSort,
    sortedSubmissions,

    signupError,
    handleSignup,
    handleDrop,
  };
}
