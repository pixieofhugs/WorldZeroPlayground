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
import { getTask, type TaskOut } from "../../api/tasks";
import {
  listPraxes,
  createPraxis,
  deletePraxis,
  type PraxisCardOut,
} from "../../api/praxis";
import { listRelationships } from "../../api/relationships";
import { listComments, type CommentOut } from "../../api/comments";
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

  // Entities.
  //
  // There is deliberately no `signups` here. `GET /tasks/{id}/signups` survives
  // as a route, but nothing on task detail consumes a roster — the population is
  // a header count (`inProgressCount`) and nothing more (owner ruling
  // 2026-07-28, reversing epic #1028 decision 3). The hook used to fetch, parse
  // and store that response on every page load and discard it; #1262 deleted the
  // request. Re-adding the slot means re-adding the round trip, so it needs a
  // `needs-design` issue for the surface that would read it, not just a state
  // field. `detailContract.test.tsx` pins the absence.
  submissions: PraxisCardOut[];
  /**
   * The comment rows for this task, fetched in the batch below off the route
   * param and handed to `CommentThread` as its seed (#1281).
   *
   * The thread cannot fetch these itself in time: `TaskDetailComments` gates on
   * `status === "active"`, so the component is unmounted — its effect cannot
   * run at all — until the task has landed. That put comments a full round trip
   * behind everything else on the page. The gate stays exactly where it is; the
   * request just no longer waits behind it. The accepted cost is one discarded
   * request on a non-active task (owner decision, #1281). Null while in flight,
   * or if that fetch failed — the thread then falls back to its own request,
   * which is also the bare-mount path.
   *
   * This is NOT a second `signups` (see the note above): these rows are read by
   * a surface that renders on every active task, not fetched and discarded.
   */
  comments: CommentOut[] | null;
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
  const [comments, setComments] = useState<CommentOut[] | null>(null);
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
      // Off the ROUTE PARAM, in this wave, and unconditionally — comments are
      // public, so this member does not move with `user` and keeps the
      // destructure below positional. See the `comments` field above for why
      // the thread cannot start this fetch itself (#1281). A failed comments
      // fetch must not fail the page, hence the local catch: the thread falls
      // back to its own request when the seed is null.
      listComments("tasks", taskId).catch(() => null),
    ];
    if (user) {
      fetches.push(
        listPraxes({ character_id: user.character?.id, status: "in_progress" }),
      );
      // ONE relationship read, split by type here (#1390). The list response
      // carries `type`, and the endpoint's filter is the only thing that
      // differed, so asking twice bought nothing but a second round trip —
      // `CharacterProfile` has always read it unfiltered.
      fetches.push(
        listRelationships()
          .then((rels) => {
            const active = rels.filter((r) => r.status === "active");
            return {
              friends: new Set(
                active
                  .filter((r) => r.type === "friend")
                  .map((r) => r.to_character_id),
              ),
              foes: new Set(
                active
                  .filter((r) => r.type === "foe")
                  .map((r) => r.to_character_id),
              ),
            };
          })
          .catch(() => ({
            friends: new Set<number>(),
            foes: new Set<number>(),
          })),
      );
    }

    Promise.all(fetches)
      .then(([t, s, c, myTasks, relationships]) => {
        setTask(t as TaskOut);
        setSubmissions(s as PraxisCardOut[]);
        setComments(c as CommentOut[] | null);
        if (myTasks) {
          const praxes = myTasks as PraxisCardOut[];
          const activeForThisTask = praxes.find(
            (p) => p.task_id === taskId,
          );
          setIsInProgress(activeForThisTask !== undefined);
          setInProgressPraxisId(activeForThisTask?.id ?? null);
          setTaskSlotCount(praxes.length);
        }
        if (relationships) {
          const { friends, foes } = relationships as {
            friends: Set<number>;
            foes: Set<number>;
          };
          setFriends(friends);
          setFoes(foes);
        }
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
      navigate(`/praxis/${praxis.id}/edit`);
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
    comments,
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
